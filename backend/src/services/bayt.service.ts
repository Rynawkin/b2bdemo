/**
 * Bayt ERP Service
 *
 * Read-only adapter for the Bayt MSSQL schema discovered in OTOOLGUN.2018.
 * It intentionally does not write orders, offers, customers, or ERP metadata.
 */

import * as sql from 'mssql';
import { config } from '../config';
import {
  MikroCategory,
  MikroProduct,
  MikroWarehouseStock,
  MikroSalesMovement,
  MikroCustomerSaleMovement,
  MikroCustomerQuoteHistory,
  MikroPendingOrder,
  MikroPendingOrderByWarehouse,
  MikroCari,
  MikroCariPersonel,
} from '../types';

type BaytStockRow = {
  productCode: string;
  warehouseCode: string;
  quantity: number;
  pendingSales: number;
  pendingPurchases: number;
};

class BaytService {
  public pool: sql.ConnectionPool | null = null;
  private vatRateById = new Map<number, number>();

  public convertVatCodeToRate(vatCode: number): number {
    return this.vatRateById.get(Number(vatCode)) ?? 0.2;
  }

  public convertVatRateToCode(rate: number): number {
    const normalized = this.normalizeVatRate(rate);
    if (!normalized) return 0;
    if (Math.abs(normalized - 0.01) < 0.001) return 1;
    if (Math.abs(normalized - 0.1) < 0.001) return 10;
    if (Math.abs(normalized - 0.2) < 0.001) return 20;
    return Math.round(normalized * 100);
  }

  public normalizeVatRate(rate: number): number {
    const numeric = Number(rate) || 0;
    return numeric > 1 ? numeric / 100 : numeric;
  }

  async connect(): Promise<void> {
    if (this.pool?.connected) return;
    if (this.pool?.connecting) {
      await this.pool.connect();
      return;
    }

    if (this.pool) {
      try {
        await this.pool.close();
      } catch {
        // Ignore stale pool close errors before reconnecting.
      }
      this.pool = null;
    }

    this.pool = new sql.ConnectionPool(config.mikro);
    this.pool.on('error', (error) => {
      console.error('WARN: Bayt pool error:', error);
      this.pool = null;
    });
    await this.pool.connect();
    await this.loadVatRates();
    console.log('Bayt ERP connection ready');
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.close();
    } finally {
      this.pool = null;
    }
  }

  async testConnection(): Promise<boolean> {
    await this.connect();
    const result = await this.pool!.request().query('SELECT 1 AS ok');
    return result.recordset?.[0]?.ok === 1;
  }

  async executeQuery(query: string): Promise<any[]> {
    await this.connect();
    this.assertReadOnlyQuery(query);
    const result = await this.pool!.request().query(query);
    return result.recordset;
  }

  private assertReadOnlyQuery(query: string): void {
    const stripped = query
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--.*$/gm, ' ')
      .trim()
      .toLowerCase();

    const startsReadOnly =
      stripped.startsWith('select') ||
      stripped.startsWith('with') ||
      stripped.startsWith('declare') ||
      stripped.startsWith('exec get_') ||
      stripped.startsWith('execute get_');

    const hasWriteKeyword = /\b(insert|update|delete|merge|drop|create|alter|truncate|grant|revoke|backup|restore)\b/.test(stripped);

    if (!startsReadOnly || hasWriteKeyword) {
      throw new Error('Bayt ERP read-only mode: raw write SQL is blocked.');
    }
  }

  private async loadVatRates(): Promise<void> {
    if (!this.pool || this.vatRateById.size > 0) return;
    try {
      const result = await this.pool.request().query(`
        SELECT ID, ORAN
        FROM KDV
        WHERE ID IS NOT NULL
      `);
      for (const row of result.recordset) {
        const id = Number(row.ID);
        const rate = this.normalizeVatRate(Number(row.ORAN));
        if (Number.isFinite(id) && Number.isFinite(rate)) {
          this.vatRateById.set(id, rate);
        }
      }
    } catch (error) {
      console.warn('WARN: Bayt KDV oranlari okunamadi, varsayilan %20 kullanilacak:', error);
    }
  }

  private trim(value: unknown): string {
    return String(value ?? '').trim();
  }

  private readonlyMode(): never {
    throw new Error('Bayt ERP read-only mode: this operation is not supported.');
  }

  async getCategories(): Promise<MikroCategory[]> {
    await this.connect();
    const result = await this.pool!.request().query(`
      SELECT DISTINCT
        COALESCE(CAST(g.ID AS varchar(30)), 'UNCATEGORIZED') AS groupId,
        COALESCE(NULLIF(LTRIM(RTRIM(g.KOD)), ''), CAST(g.ID AS varchar(30)), 'GENEL') AS code,
        COALESCE(NULLIF(LTRIM(RTRIM(g.IZAH)), ''), NULLIF(LTRIM(RTRIM(g.KOD)), ''), 'Genel') AS name
      FROM STOK s
      LEFT JOIN GRUP g ON g.ID = s.OZELGRUP1
      WHERE NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
        AND ISNULL(s.DURUM, 1) = 1
    `);

    const categories = result.recordset.map((row: any) => {
      const id = this.trim(row.groupId);
      return {
        id,
        code: id === 'UNCATEGORIZED' ? 'BAYT-UNCATEGORIZED' : `BAYT-GRP-${id}`,
        name: this.trim(row.name) || this.trim(row.code) || 'Genel',
      };
    });

    if (!categories.some((category: MikroCategory) => category.code === 'BAYT-UNCATEGORIZED')) {
      categories.push({ id: 'UNCATEGORIZED', code: 'BAYT-UNCATEGORIZED', name: 'Genel' });
    }

    return categories;
  }

  async getProducts(): Promise<MikroProduct[]> {
    await this.connect();
    const productResult = await this.pool!.request().query(`
        SELECT
          s.ID,
          s.KOD,
          s.ADI,
          s.ACIKLAMA,
          s.OZELGRUP1,
          g.KOD AS groupCode,
          s.KDVID,
          COALESCE(k.ORAN, 20) AS vatRate,
          COALESCE(NULLIF(LTRIM(RTRIM(unitGroup.IZAH)), ''), NULLIF(LTRIM(RTRIM(unitGroup.KOD)), ''), 'ADET') AS unitName,
          buyPrice.FIYAT AS purchasePrice,
          buyPrice.SONGUNCELTAR AS purchaseDate
        FROM STOK s
        LEFT JOIN GRUP g ON g.ID = s.OZELGRUP1
        LEFT JOIN KDV k ON k.ID = s.KDVID
        OUTER APPLY (
          SELECT TOP 1 sb.BIRIMID
          FROM STK_BIRIM sb
          WHERE sb.STOKID = s.ID
          ORDER BY ISNULL(sb.VARSAYILAN, 0) DESC, ISNULL(sb.SIRANO, 999), sb.ID
        ) defaultUnit
        LEFT JOIN GRUP unitGroup ON unitGroup.ID = defaultUnit.BIRIMID
        OUTER APPLY (
          SELECT TOP 1 sf.FIYAT, sf.SONGUNCELTAR
          FROM STK_FIYAT sf
          WHERE sf.STOKID = s.ID
            AND sf.TIP = 'A'
            AND ISNULL(sf.FIYAT, 0) > 0
          ORDER BY ISNULL(sf.DEFFIYAT, 0) DESC, sf.SONGUNCELTAR DESC, sf.ID DESC
        ) buyPrice
        WHERE NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
          AND ISNULL(s.DURUM, 1) = 1
        ORDER BY s.KOD
      `);
    const stockRows = await this.getCurrentStockRows();

    const stockMap = new Map<string, Record<string, number>>();
    for (const row of stockRows) {
      const productCode = this.trim(row.productCode);
      if (!productCode) continue;
      const warehouses = stockMap.get(productCode) || {};
      warehouses[row.warehouseCode] = Number(row.quantity) || 0;
      stockMap.set(productCode, warehouses);
    }

    return productResult.recordset.map((row: any) => {
      const code = this.trim(row.KOD);
      const groupId = this.trim(row.OZELGRUP1);
      const purchasePrice = Number(row.purchasePrice) || 0;
      return {
        id: String(row.ID),
        code,
        name: this.trim(row.ADI) || code,
        foreignName: this.trim(row.ACIKLAMA) || null,
        brandCode: this.trim(row.groupCode) || null,
        categoryId: groupId ? `BAYT-GRP-${groupId}` : 'BAYT-UNCATEGORIZED',
        unit: this.trim(row.unitName) || 'ADET',
        unit2: null,
        unit2Factor: null,
        vatRate: this.normalizeVatRate(Number(row.vatRate) || 20),
        lastEntryPrice: purchasePrice,
        lastEntryDate: row.purchaseDate || undefined,
        currentCost: purchasePrice,
        currentCostDate: row.purchaseDate || undefined,
        warehouseStocks: stockMap.get(code) || {},
      };
    });
  }

  private async getCurrentStockRows(): Promise<BaytStockRow[]> {
    await this.connect();
    const result = await this.pool!.request().query(`
      WITH latestStock AS (
        SELECT
          s.KOD AS productCode,
          CAST(d.ID AS varchar(30)) AS warehouseCode,
          ISNULL(a.MEVCUT, 0) AS quantity,
          ISNULL(a.BEK_SATISSIP, 0) AS pendingSales,
          ISNULL(a.BEK_ALISSIP, 0) AS pendingPurchases,
          ROW_NUMBER() OVER (
            PARTITION BY a.KARTID, a.DEPOID
            ORDER BY ISNULL(a.YIL, 0) DESC, ISNULL(a.AY, 0) DESC, a.SONISLEMZAMANI DESC
          ) AS rn
        FROM STK_AYLIK a
        INNER JOIN STOK s ON s.ID = a.KARTID
        INNER JOIN DEPO d ON d.ID = a.DEPOID AND ISNULL(d.DURUM, 1) = 1
        WHERE NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
      )
      SELECT productCode, warehouseCode, quantity, pendingSales, pendingPurchases
      FROM latestStock
      WHERE rn = 1
    `);

    return result.recordset.map((row: any) => ({
      productCode: this.trim(row.productCode),
      warehouseCode: this.trim(row.warehouseCode),
      quantity: Number(row.quantity) || 0,
      pendingSales: Number(row.pendingSales) || 0,
      pendingPurchases: Number(row.pendingPurchases) || 0,
    }));
  }

  async getWarehouseStocks(): Promise<MikroWarehouseStock[]> {
    const rows = await this.getCurrentStockRows();
    return rows.map((row) => ({
      productCode: row.productCode,
      warehouseCode: row.warehouseCode,
      quantity: row.quantity,
    }));
  }

  async getSalesHistory(): Promise<MikroSalesMovement[]> {
    await this.connect();
    const result = await this.pool!.request().query(`
      SELECT
        s.KOD AS productCode,
        CONVERT(date, h.FISTAR) AS saleDate,
        SUM(ISNULL(h.MIKTAR, 0)) AS totalQuantity
      FROM STK_FIS_HAR h
      INNER JOIN STOK s ON s.ID = h.KARTID
      WHERE ISNULL(h.IPTAL, 0) = 0
        AND h.ISLEMTIPI = 1
        AND h.FISTAR >= DATEADD(day, -180, CAST(GETDATE() AS date))
        AND NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
      GROUP BY s.KOD, CONVERT(date, h.FISTAR)
    `);

    return result.recordset.map((row: any) => ({
      productCode: this.trim(row.productCode),
      saleDate: row.saleDate,
      totalQuantity: Number(row.totalQuantity) || 0,
    }));
  }

  async getPendingOrders(): Promise<MikroPendingOrder[]> {
    const rows = await this.getPendingOrdersByWarehouse();
    const aggregate = new Map<string, MikroPendingOrder>();
    for (const row of rows) {
      const key = `${row.productCode}|${row.type}`;
      const current = aggregate.get(key) || {
        productCode: row.productCode,
        quantity: 0,
        type: row.type,
      };
      current.quantity += row.quantity;
      aggregate.set(key, current);
    }
    return Array.from(aggregate.values());
  }

  async getPendingOrdersByWarehouse(): Promise<MikroPendingOrderByWarehouse[]> {
    const rows = await this.getCurrentStockRows();
    const pending: MikroPendingOrderByWarehouse[] = [];
    for (const row of rows) {
      if (row.pendingSales > 0) {
        pending.push({
          productCode: row.productCode,
          warehouseCode: row.warehouseCode,
          quantity: row.pendingSales,
          type: 'SALES',
        });
      }
      if (row.pendingPurchases > 0) {
        pending.push({
          productCode: row.productCode,
          warehouseCode: row.warehouseCode,
          quantity: row.pendingPurchases,
          type: 'PURCHASE',
        });
      }
    }
    return pending;
  }

  async getCariList(): Promise<MikroCari[]> {
    return this.getCariDetails();
  }

  async getCariDetails(): Promise<MikroCari[]> {
    await this.connect();
    const result = await this.pool!.request().query(`
      SELECT
        c.KOD AS code,
        c.ADI AS name,
        c.DURUM AS active,
        c.VADEGUNSAYISI AS paymentTerm,
        c.EFATKULLAN AS hasEInvoice,
        c.MUTABAKAT_GSM AS phone,
        c.OZELGRUP1 AS groupCode,
        c.OZELALAN1 AS sectorCode
      FROM CARI c
      WHERE NULLIF(LTRIM(RTRIM(c.KOD)), '') IS NOT NULL
      ORDER BY c.KOD
    `);

    return result.recordset.map((row: any) => ({
      code: this.trim(row.code),
      name: this.trim(row.name),
      phone: this.trim(row.phone) || undefined,
      isLocked: row.active === false || row.active === 0,
      groupCode: this.trim(row.groupCode) || undefined,
      sectorCode: this.trim(row.sectorCode) || undefined,
      paymentTerm: row.paymentTerm === null || row.paymentTerm === undefined ? null : Number(row.paymentTerm),
      paymentPlanNo: null,
      paymentPlanCode: null,
      paymentPlanName: null,
      hasEInvoice: Boolean(row.hasEInvoice),
      balance: 0,
    }));
  }

  async getCariPersonelList(): Promise<MikroCariPersonel[]> {
    return [];
  }

  async getPurchasedProductCodes(cariCode: string): Promise<string[]> {
    await this.connect();
    const result = await this.pool!.request()
      .input('cariCode', sql.NVarChar(80), cariCode)
      .query(`
        SELECT DISTINCT s.KOD AS productCode
        FROM STK_FIS_HAR h
        INNER JOIN STOK s ON s.ID = h.KARTID
        INNER JOIN CARI c ON c.ID = h.CARIID
        WHERE c.KOD = @cariCode
          AND ISNULL(h.IPTAL, 0) = 0
          AND h.ISLEMTIPI = 1
          AND NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
      `);
    return result.recordset.map((row: any) => this.trim(row.productCode)).filter(Boolean);
  }

  async getCustomerSalesMovements(
    cariCode: string,
    productCodes: string[] = [],
    limit = 1000,
  ): Promise<MikroCustomerSaleMovement[]> {
    await this.connect();
    const request = this.pool!.request()
      .input('cariCode', sql.NVarChar(80), cariCode)
      .input('limit', sql.Int, Math.max(1, Math.min(Number(limit) || 1000, 5000)));

    const codeFilter = productCodes.length > 0
      ? `AND s.KOD IN (${productCodes.map((code, index) => {
          request.input(`code${index}`, sql.NVarChar(80), code);
          return `@code${index}`;
        }).join(', ')})`
      : '';

    const result = await request.query(`
      SELECT TOP (@limit)
        s.KOD AS productCode,
        h.FISTAR AS saleDate,
        h.MIKTAR AS quantity,
        h.FIYAT AS unitPrice,
        h.TUTAR AS lineTotal,
        ISNULL(h.KDVTUTARI, 0) AS vatAmount,
        ISNULL(h.KDVORANI, 0) AS vatRate,
        COALESCE(h.FATFISNO, h.STKFISNO, h.SIPNO, h.TEKLIFNO, h.BAGLI_FISNO) AS documentNo
      FROM STK_FIS_HAR h
      INNER JOIN STOK s ON s.ID = h.KARTID
      INNER JOIN CARI c ON c.ID = h.CARIID
      WHERE c.KOD = @cariCode
        AND ISNULL(h.IPTAL, 0) = 0
        AND h.ISLEMTIPI = 1
        ${codeFilter}
      ORDER BY h.FISTAR DESC, h.ID DESC
    `);

    return result.recordset.map((row: any) => ({
      productCode: this.trim(row.productCode),
      saleDate: row.saleDate,
      quantity: Number(row.quantity) || 0,
      unitPrice: Number(row.unitPrice) || 0,
      lineTotal: Number(row.lineTotal) || 0,
      vatAmount: Number(row.vatAmount) || 0,
      vatRate: this.normalizeVatRate(Number(row.vatRate) || 0),
      vatZeroed: false,
      documentNo: this.trim(row.documentNo) || null,
      orderNumber: null,
    }));
  }

  async getCustomerQuoteHistory(): Promise<MikroCustomerQuoteHistory[]> {
    return [];
  }

  async getPriceListMap(): Promise<Map<string, number[]>> {
    await this.connect();
    const result = await this.pool!.request().query(`
      WITH rankedPrices AS (
        SELECT
          s.KOD AS productCode,
          CASE
            WHEN sf.TIP = 'S' AND sf.ADIID = 6540 THEN 2
            ELSE 1
          END AS listNo,
          sf.FIYAT AS price,
          ROW_NUMBER() OVER (
            PARTITION BY s.KOD,
              CASE WHEN sf.TIP = 'S' AND sf.ADIID = 6540 THEN 2 ELSE 1 END
            ORDER BY ISNULL(sf.DEFFIYAT, 0) DESC, sf.SONGUNCELTAR DESC, sf.ID DESC
          ) AS rn
        FROM STK_FIYAT sf
        INNER JOIN STOK s ON s.ID = sf.STOKID
        WHERE sf.TIP = 'S'
          AND ISNULL(sf.FIYAT, 0) > 0
          AND NULLIF(LTRIM(RTRIM(s.KOD)), '') IS NOT NULL
          AND (sf.ADIID IN (149, 6540) OR ISNULL(sf.DEFFIYAT, 0) = 1)
      )
      SELECT productCode, listNo, price
      FROM rankedPrices
      WHERE rn = 1
    `);

    const map = new Map<string, number[]>();
    for (const row of result.recordset) {
      const code = this.trim(row.productCode);
      const listNo = Number(row.listNo);
      if (!code || listNo < 1 || listNo > 10) continue;
      const lists = map.get(code) || Array(10).fill(0);
      lists[listNo - 1] = Number(row.price) || 0;
      map.set(code, lists);
    }
    return map;
  }

  async getProductGuidsByCodes(codes: string[]): Promise<Array<{ code: string; guid: string | null }>> {
    return codes.map((code) => ({ code, guid: null }));
  }

  async getQuoteLines(): Promise<any[]> {
    return [];
  }

  async getQuoteBelgeNos(): Promise<Map<string, string>> {
    return new Map();
  }

  async getQuoteLineGuids(): Promise<any[]> {
    return [];
  }

  async hasOrdersForQuote(): Promise<boolean> {
    return false;
  }

  async getEInvoiceMetadataByGibNo(): Promise<any> {
    return null;
  }

  async getInvoiceTotalsByEvrak(): Promise<any> {
    return null;
  }

  async writeOrder(): Promise<any> {
    return this.readonlyMode();
  }

  async writeQuote(): Promise<any> {
    return this.readonlyMode();
  }

  async updateQuote(): Promise<any> {
    return this.readonlyMode();
  }

  async updateOrderLines(): Promise<any> {
    return this.readonlyMode();
  }

  async ensureCariExists(): Promise<any> {
    return this.readonlyMode();
  }

  async closeQuoteLines(): Promise<any> {
    return this.readonlyMode();
  }

  async reopenQuoteLines(): Promise<any> {
    return this.readonlyMode();
  }
}

export default new BaytService();
