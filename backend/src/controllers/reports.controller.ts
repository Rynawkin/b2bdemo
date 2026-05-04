/**
 * Raporlar Controller
 *
 * ERP raporlarını yöneten controller
 */

import { Request, Response } from 'express';
import { mikroReportsService } from '../services/mikro-reports.service';

/**
 * Maliyet Güncelleme Uyarıları Raporu
 *
 * GET /api/admin/reports/cost-update-alerts
 *
 * Query params:
 * - dayDiff: number (minimum gün farkı)
 * - percentDiff: number (minimum % fark)
 * - category: string (kategori kodu)
 * - page: number
 * - limit: number
 * - sortBy: string
 * - sortOrder: 'asc' | 'desc'
 */
export const getCostUpdateAlerts = async (req: Request, res: Response) => {
  try {
    const {
      dayDiff,
      percentDiff,
      category,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const options = {
      dayDiff: dayDiff ? parseInt(dayDiff as string) : undefined,
      percentDiff: percentDiff ? parseFloat(percentDiff as string) : undefined,
      category: category as string | undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
      sortBy: (sortBy as string) || 'riskAmount',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    };

    console.log('📊 Maliyet uyarıları raporu istendi:', options);

    const data = await mikroReportsService.getCostUpdateAlerts(options);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('❌ Maliyet uyarıları raporu hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Rapor oluşturulurken hata oluştu',
    });
  }
};

/**
 * Rapor Kategorileri Listesi
 *
 * GET /api/admin/reports/categories
 *
 * Filtreleme için kategori listesini döner
 */
export const getReportCategories = async (req: Request, res: Response) => {
  try {
    // Bu endpoint'i mikroService'den kategori listesi çekerek implement edebiliriz
    // Şimdilik basit bir response dönelim

    res.json({
      success: true,
      data: {
        categories: [
          // Bu listeyi dinamik olarak STOK_KATEGORILERI tablosundan çekebiliriz
        ],
      },
    });
  } catch (error: any) {
    console.error('❌ Kategori listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Kategori listesi alınamadı',
    });
  }
};
