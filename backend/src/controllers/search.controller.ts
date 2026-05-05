import { Request, Response } from 'express';
import stockF10Service from '../services/stock-f10.service';
import customerF10Service from '../services/customer-f10.service';
import prisma from '../utils/prisma';
import { config } from '../config';

/**
 * GET /api/search/stocks/columns
 * Stok F10 için tüm mevcut kolonları döndürür
 */
export const getStockColumns = async (req: Request, res: Response) => {
  try {
    const columns = stockF10Service.getAvailableColumns();
    res.json({ columns });
  } catch (error: any) {
    console.error('Stok kolonları alınırken hata:', error);
    res.status(500).json({ message: 'Stok kolonları alınamadı', error: error.message });
  }
};

/**
 * GET /api/search/stocks/units
 * Stok birimlerini (birim1 + birim2) döndürür
 */
export const getStockUnits = async (req: Request, res: Response) => {
  try {
    const [unitRows, unit2Rows] = await Promise.all([
      prisma.product.findMany({
        select: { unit: true },
        distinct: ['unit'],
      }),
      prisma.product.findMany({
        select: { unit2: true },
        distinct: ['unit2'],
        where: { unit2: { not: null } },
      }),
    ]);

    const units = new Set<string>();
    unitRows.forEach((row) => {
      if (row.unit) units.add(row.unit.trim());
    });
    unit2Rows.forEach((row) => {
      if (row.unit2) units.add(row.unit2.trim());
    });

    const sorted = Array.from(units)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'tr'));

    res.json({ units: sorted });
  } catch (error: any) {
    console.error('Stok birimleri alınırken hata:', error);
    res.status(500).json({ message: 'Stok birimleri alınamadı', error: error.message });
  }
};

/**
 * GET /api/search/customers/columns
 * Cari F10 için tüm mevcut kolonları döndürür
 */
export const getCustomerColumns = async (req: Request, res: Response) => {
  try {
    const columns = customerF10Service.getAvailableColumns();
    res.json({ columns });
  } catch (error: any) {
    console.error('Cari kolonları alınırken hata:', error);
    res.status(500).json({ message: 'Cari kolonları alınamadı', error: error.message });
  }
};

/**
 * GET /api/search/stocks
 * Stok F10 araması yapar
 * Query params:
 *   - searchTerm: Aranacak kelime (opsiyonel)
 *   - limit: Maksimum sonuç sayısı (varsayılan: 100)
 *   - offset: Başlangıç noktası (varsayılan: 0)
 */
export const searchStocks = async (req: Request, res: Response) => {
  try {
    const { searchTerm, limit = 100, offset = 0 } = req.query;

    const result = await stockF10Service.searchStocks({
      searchTerm: searchTerm as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });

    res.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error: any) {
    console.error('Stok arama hatası:', error);
    res.status(500).json({ message: 'Stok araması yapılamadı', error: error.message });
  }
};

/**
 * POST /api/search/stocks/by-codes
 * Belirli stok kodlarÄ±nÄ±n F10 verilerini getirir
 * Body: { codes: string[] }
 */
export const getStocksByCodes = async (req: Request, res: Response) => {
  try {
    const { codes } = req.body as { codes?: string[] };
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.json({ success: true, data: [] });
    }

    if (config.erpProvider === 'bayt') {
      const uniqueCodes = Array.from(
        new Set(
          codes
            .map((code) => String(code || '').trim())
            .filter(Boolean)
        )
      ).slice(0, 500);

      const products = await prisma.product.findMany({
        where: {
          active: true,
          mikroCode: { in: uniqueCodes },
        },
        select: {
          mikroCode: true,
          name: true,
          unit: true,
          vatRate: true,
          currentCost: true,
          lastEntryPrice: true,
          warehouseStocks: true,
        },
      });

      const result = products.map((product) => {
        const warehouseStocks = (product.warehouseStocks || {}) as Record<string, unknown>;
        const stockValues = Object.values(warehouseStocks).map((value) =>
          Math.max(0, Number(value) || 0)
        );
        const totalStock = stockValues.reduce((sum, value) => sum + value, 0);
        const primaryStock = Math.max(0, Number(warehouseStocks['1']) || 0);
        return {
          msg_S_0078: product.mikroCode,
          msg_S_0870: product.name,
          'Stok Kodu': product.mikroCode,
          'Stok Adı': product.name,
          'Stok Adi': product.name,
          'Birim': product.unit,
          'KDV Oranı': product.vatRate,
          'KDV Orani': product.vatRate,
          'Güncel Maliyet + Kdv.': product.currentCost ?? product.lastEntryPrice ?? 0,
          'Guncel Maliyet + Kdv.': product.currentCost ?? product.lastEntryPrice ?? 0,
          'Merkez Depo': primaryStock,
          'Toplam Satılabilir': totalStock,
          'Toplam Satilabilir': totalStock,
          warehouseStocks,
        };
      });

      return res.json({ success: true, data: result, total: result.length });
    }

    const result = await stockF10Service.getStocksByCodes(codes);
    res.json({ success: true, data: result, total: result.length });
  } catch (error: any) {
    console.error('Stok kodlarÄ± getirilirken hata:', error);
    res.status(500).json({ message: 'Stok kodlarÄ± alÄ±namadÄ±', error: error.message });
  }
};

/**
 * GET /api/search/customers
 * Cari F10 araması yapar
 * Query params:
 *   - searchTerm: Aranacak kelime (opsiyonel)
 *   - limit: Maksimum sonuç sayısı (varsayılan: 100)
 *   - offset: Başlangıç noktası (varsayılan: 0)
 */
export const searchCustomers = async (req: Request, res: Response) => {
  try {
    const { searchTerm, limit = 100, offset = 0 } = req.query;

    const result = await customerF10Service.searchCustomers({
      searchTerm: searchTerm as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });

    res.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error: any) {
    console.error('Cari arama hatası:', error);
    res.status(500).json({ message: 'Cari araması yapılamadı', error: error.message });
  }
};

/**
 * GET /api/search/preferences
 * Kullanıcının kolon tercihlerini döndürür
 */
export const getSearchPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Yetkisiz erişim' });
    }

    let preferences = await prisma.userSearchPreferences.findUnique({
      where: { userId }
    });

    // Tercih yoksa varsayılan değerlerle oluştur
    if (!preferences) {
      preferences = await prisma.userSearchPreferences.create({
        data: {
          userId,
          stockColumns: ['msg_S_0078', 'msg_S_0870', 'KDV Oranı', 'Güncel Maliyet + Kdv.', 'Merkez Depo', 'Toplam Satılabilir'],
          customerColumns: ['msg_S_1032', 'msg_S_1033', 'IL', 'ILCE', 'Telefon', 'Vergi No', 'SEKTOR KODU', 'msg_S_1530']
        }
      });
    }

    res.json({ preferences });
  } catch (error: any) {
    console.error('Tercihler alınırken hata:', error);
    res.status(500).json({ message: 'Tercihler alınamadı', error: error.message });
  }
};

/**
 * PUT /api/search/preferences
 * Kullanıcının kolon tercihlerini günceller
 * Body:
 *   - stockColumns: string[] (opsiyonel)
 *   - customerColumns: string[] (opsiyonel)
 */
export const updateSearchPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Yetkisiz erişim' });
    }

    const { stockColumns, customerColumns } = req.body;

    // Tercih yoksa oluştur, varsa güncelle
    const preferences = await prisma.userSearchPreferences.upsert({
      where: { userId },
      create: {
        userId,
        stockColumns: stockColumns || [],
        customerColumns: customerColumns || []
      },
      update: {
        ...(stockColumns !== undefined && { stockColumns }),
        ...(customerColumns !== undefined && { customerColumns })
      }
    });

    res.json({ success: true, preferences });
  } catch (error: any) {
    console.error('Tercihler güncellenirken hata:', error);
    res.status(500).json({ message: 'Tercihler güncellenemedi', error: error.message });
  }
};
