/**
 * ERP Raporlama Servisi
 *
 * ERP veritabanından çeşitli raporlar oluşturur
 */

import * as sql from 'mssql';
import { config } from '../config';
import exclusionService from './exclusion.service';

interface CostUpdateAlert {
  productCode: string;
  productName: string;
  category: string;

  // Güncel maliyet bilgileri
  currentCostDate: Date | null;
  currentCost: number; // KDV HARİÇ (sto_standartmaliyet)

  // Son giriş bilgileri
  lastEntryDate: Date | null;
  lastEntryCost: number; // KDV HARİÇ

  // Fark hesaplamaları
  diffAmount: number; // KDV HARİÇ
  diffPercent: number;
  dayDiff: number;

  // Stok bilgileri
  stockQuantity: number;
  riskAmount: number; // diffAmount * stockQuantity

  // Satış fiyatı
  salePrice: number;
}

interface CostUpdateAlertSummary {
  totalAlerts: number;
  totalRiskAmount: number;
  totalStockValue: number;
  avgDiffPercent: number;
}

interface CostUpdateAlertResponse {
  summary: CostUpdateAlertSummary;
  products: CostUpdateAlert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MikroReportsService {
  private pool: sql.ConnectionPool | null = null;

  /**
   * ERP veritabanına bağlan
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      this.pool = await sql.connect(config.mikro);
      console.log('✅ ERP bağlantısı başarılı (Reports)');
    } catch (error) {
      console.error('❌ ERP bağlantı hatası:', error);
      throw new Error('ERP bağlantısı kurulamadı');
    }
  }

  /**
   * Bağlantıyı kapat
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('🔌 ERP bağlantısı kapatıldı (Reports)');
    }
  }

  /**
   * Maliyet Güncelleme Uyarıları Raporu
   *
   * Son giriş tarihi güncel maliyet tarihinden daha yeni olmasına rağmen
   * son giriş maliyeti güncel maliyetten yüksek olan ürünleri listeler.
   *
   * Bu durum satış fiyatlarının güncellenme ihtiyacını gösterir.
   */
  async getCostUpdateAlerts(options: {
    dayDiff?: number;
    percentDiff?: number;
    category?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<CostUpdateAlertResponse> {
    await this.connect();

    const {
      dayDiff = 0,
      percentDiff = 0,
      category,
      page = 1,
      limit = 50,
      sortBy = 'riskAmount',
      sortOrder = 'desc',
    } = options;

    const offset = (page - 1) * limit;
    const exclusions = await exclusionService.getActiveExclusions();
    const excludedProductCodes = Array.from(
      new Set(
        exclusions.productCodes
          .map((code) => String(code || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    const excludedProductNames = Array.from(
      new Set(
        exclusions.productNames
          .map((name) => String(name || '').trim())
          .filter(Boolean)
      )
    );
    const productCodeExclusionSql =
      excludedProductCodes.length > 0
        ? `AND RTRIM(sto_kod) NOT IN (${excludedProductCodes
            .map((code) => `'${code.replace(/'/g, "''")}'`)
            .join(', ')})`
        : '';
    const productNameExclusionSql =
      excludedProductNames.length > 0
        ? `AND ${excludedProductNames
            .map((name) => `sto_isim NOT LIKE '%${name.replace(/'/g, "''")}%'`)
            .join(' AND ')}`
        : '';

    // Ana sorgu - CTE kullanarak optimize edilmiş
    const query = `
      WITH ProductCosts AS (
        SELECT
          sto_kod AS productCode,
          sto_isim AS productName,
          sto_kategori_kodu AS category,

          -- Güncel maliyet tarihi
          sto_maliyet_tarih AS currentCostDate,

          -- Güncel maliyet (KDV HARİÇ)
          sto_standartmaliyet AS currentCost,

          -- Son giriş tarihi
          (SELECT TOP 1 sth_tarih
           FROM STOK_HAREKETLERI
           WHERE sth_tip = 0
             AND sth_evraktip IN (3, 13)
             AND sth_cins IN (0, 1)
             AND sth_stok_kod = STOKLAR.sto_kod
             AND sth_normal_iade = 0
           ORDER BY sth_tarih DESC) AS lastEntryDate,

          -- Son giriş maliyeti (KDV HARİÇ)
          (SELECT TOP 1
             dbo.fn_StokHareketNetDeger(
               sth_tutar,
               sth_iskonto1,
               sth_iskonto2,
               sth_iskonto3,
               sth_iskonto4,
               sth_iskonto5,
               sth_iskonto6,
               sth_masraf1,
               sth_masraf2,
               sth_masraf3,
               sth_masraf4,
               sth_otvtutari,
               sth_tip,
               0,
               0,
               sth_har_doviz_kuru,
               sth_alt_doviz_kuru,
               sth_stok_doviz_kuru
             ) / sth_miktar
           FROM STOK_HAREKETLERI
           WHERE sth_tip = 0
             AND sth_evraktip IN (3, 13)
             AND sth_cins IN (0, 1)
             AND sth_stok_kod = STOKLAR.sto_kod
             AND sth_normal_iade = 0
             AND sth_fat_uid != '00000000-0000-0000-0000-000000000000'
           ORDER BY sth_tarih DESC) AS lastEntryCost,

          -- Toplam eldeki miktar
          dbo.fn_EldekiMiktar(sto_kod) AS stockQuantity,

          -- Satış fiyatı (P-5 listesi)
          dbo.fn_StokSatisFiyati(sto_kod, 5, 0, 1) AS salePrice

        FROM STOKLAR
        WHERE sto_pasif_fl = 0
          ${category ? `AND sto_kategori_kodu = @category` : ''}
          ${productCodeExclusionSql}
          ${productNameExclusionSql}
      ),
      FilteredProducts AS (
        SELECT
          *,
          -- Fark hesaplamaları
          (lastEntryCost - currentCost) AS diffAmount,
          CASE
            WHEN currentCost > 0
            THEN ((lastEntryCost - currentCost) / currentCost * 100)
            ELSE 0
          END AS diffPercent,
          DATEDIFF(day, currentCostDate, lastEntryDate) AS dayDiff,
          (lastEntryCost - currentCost) * stockQuantity AS riskAmount
        FROM ProductCosts
        WHERE lastEntryDate IS NOT NULL
          AND currentCostDate IS NOT NULL
          AND lastEntryCost IS NOT NULL
          AND currentCost IS NOT NULL
          AND lastEntryDate > currentCostDate
          AND lastEntryCost > currentCost
          ${dayDiff > 0 ? `AND DATEDIFF(day, currentCostDate, lastEntryDate) >= @dayDiff` : ''}
          ${percentDiff > 0 ? `AND ((lastEntryCost - currentCost) / currentCost * 100) >= @percentDiff` : ''}
      )
      SELECT
        productCode,
        productName,
        category,
        currentCostDate,
        currentCost,
        lastEntryDate,
        lastEntryCost,
        diffAmount,
        diffPercent,
        dayDiff,
        stockQuantity,
        riskAmount,
        salePrice,
        COUNT(*) OVER() AS totalCount
      FROM FilteredProducts
      ORDER BY
        CASE WHEN @sortOrder = 'asc' THEN
          CASE @sortBy
            WHEN 'productName' THEN productName
            WHEN 'category' THEN category
          END
        END ASC,
        CASE WHEN @sortOrder = 'desc' THEN
          CASE @sortBy
            WHEN 'productName' THEN productName
            WHEN 'category' THEN category
          END
        END DESC,
        CASE WHEN @sortOrder = 'asc' THEN
          CASE @sortBy
            WHEN 'riskAmount' THEN riskAmount
            WHEN 'diffPercent' THEN diffPercent
            WHEN 'dayDiff' THEN dayDiff
            WHEN 'diffAmount' THEN diffAmount
          END
        END ASC,
        CASE WHEN @sortOrder = 'desc' THEN
          CASE @sortBy
            WHEN 'riskAmount' THEN riskAmount
            WHEN 'diffPercent' THEN diffPercent
            WHEN 'dayDiff' THEN dayDiff
            WHEN 'diffAmount' THEN diffAmount
          END
        END DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const request = this.pool!.request();

    if (category) request.input('category', sql.NVarChar(25), category);
    if (dayDiff > 0) request.input('dayDiff', sql.Int, dayDiff);
    if (percentDiff > 0) request.input('percentDiff', sql.Float, percentDiff);
    request.input('sortBy', sql.NVarChar(50), sortBy);
    request.input('sortOrder', sql.NVarChar(4), sortOrder);
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const result = await request.query(query);

    const products: CostUpdateAlert[] = result.recordset.map((row: any) => ({
      productCode: row.productCode,
      productName: row.productName,
      category: row.category,
      currentCostDate: row.currentCostDate,
      currentCost: parseFloat(row.currentCost) || 0,
      lastEntryDate: row.lastEntryDate,
      lastEntryCost: parseFloat(row.lastEntryCost) || 0,
      diffAmount: parseFloat(row.diffAmount) || 0,
      diffPercent: parseFloat(row.diffPercent) || 0,
      dayDiff: parseInt(row.dayDiff) || 0,
      stockQuantity: parseFloat(row.stockQuantity) || 0,
      riskAmount: parseFloat(row.riskAmount) || 0,
      salePrice: parseFloat(row.salePrice) || 0,
    }));

    const totalCount = result.recordset.length > 0 ? result.recordset[0].totalCount : 0;

    // Özet hesapla
    const summary: CostUpdateAlertSummary = {
      totalAlerts: totalCount,
      totalRiskAmount: products.reduce((sum, p) => sum + p.riskAmount, 0),
      totalStockValue: products.reduce((sum, p) => sum + (p.lastEntryCost * p.stockQuantity), 0),
      avgDiffPercent: products.length > 0
        ? products.reduce((sum, p) => sum + p.diffPercent, 0) / products.length
        : 0,
    };

    return {
      summary,
      products,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}

// Singleton instance
export const mikroReportsService = new MikroReportsService();
