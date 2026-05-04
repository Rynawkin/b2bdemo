/**
 * Sync Service
 *
 * ERP'den veri çekip PostgreSQL'e senkronize eder:
 * 1. Kategorileri sync
 * 2. Ürünleri sync
 * 3. Stokları güncelle
 * 4. Satış geçmişini güncelle
 * 5. Fazla stok hesapla
 * 6. Fiyatları hesapla
 */

import { prisma } from '../utils/prisma';
import mikroService from './mikroFactory.service';
import pricingService from './pricing.service';
import stockService from './stock.service';
import imageService from './image.service';
import priceSyncService from './priceSync.service';

class SyncService {
  /**
   * Tarih string'ini parse et (Türkçe formatı ISO'ya çevir)
   * Geçersiz tarihler için null döner
   */
  private parseDateString(dateStr: string | Date | null | undefined): Date | null {
    if (!dateStr) {
      return null;
    }

    // Eğer zaten Date objesi ise direkt döndür
    if (dateStr instanceof Date) {
      return dateStr;
    }

    // String kontrolü
    if (typeof dateStr !== 'string' || dateStr.trim() === '') {
      return null;
    }

    // Eğer zaten ISO formatındaysa direkt parse et
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Türkçe format: "22.3.2024" veya "22.03.2024"
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    return null;
  }

  /**
   * Senkronizasyonu arka planda başlat ve log ID'sini döndür
   */
  async startSync(syncType: 'AUTO' | 'MANUAL' = 'MANUAL'): Promise<string> {
    // Sync log oluştur
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Arka planda sync'i çalıştır (await etme!)
    this.runFullSync(syncLog.id).catch((error) => {
      console.error('❌ Background sync error:', error);
    });

    if (syncType === 'MANUAL') {
      priceSyncService.syncPriceChanges().catch((error) => {
        console.error('❌ Background price sync error:', error);
      });
    }

    return syncLog.id;
  }

  /**
   * Tam senkronizasyon çalıştır
   */
  async runFullSync(syncLogId: string): Promise<{
    success: boolean;
    stats: {
      categoriesUpdated: number;
      productsUpdated: number;
      pricesCalculated: number;
    };
    error?: string;
  }> {
    const startTime = new Date();

    try {
      console.log('🔄 Senkronizasyon başladı...');

      // 1. Kategorileri sync
      const categoriesCount = await this.syncCategories();
      console.log(`✅ ${categoriesCount} kategori sync edildi`);

      // Progress güncelle
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { categoriesCount },
      });

      // 2. Ürünleri sync (stoklar, satış geçmişi dahil)
      const productsCount = await this.syncProducts();
      console.log(`✅ ${productsCount} ürün sync edildi`);

      // Progress güncelle
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: { productsCount },
      });

      // 3. Fazla stok hesapla
      await stockService.calculateExcessStockForAllProducts(syncLogId);
      console.log('✅ Fazla stoklar hesaplandı');

      // 4. Fiyatları hesapla
      const pricesCount = await pricingService.recalculateAllPrices(syncLogId);
      console.log(`✅ ${pricesCount} ürün için fiyatlar hesaplandı`);

      // Settings'deki lastSyncAt güncelle
      await prisma.settings.updateMany({
        data: { lastSyncAt: new Date() },
      });

      // Sync log güncelle (resim sync artık ayrı)
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'SUCCESS',
          categoriesCount,
          productsCount,
          completedAt: new Date(),
        },
      });

      console.log('🎉 Senkronizasyon tamamlandı!');

      return {
        success: true,
        stats: {
          categoriesUpdated: categoriesCount,
          productsUpdated: productsCount,
          pricesCalculated: pricesCount,
        },
      };
    } catch (error: any) {
      console.error('❌ Senkronizasyon hatası:', error);

      // Sync log'u hata olarak güncelle
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        stats: {
          categoriesUpdated: 0,
          productsUpdated: 0,
          pricesCalculated: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * Kategorileri ERP'den çek ve sync et
   */
  private async syncCategories(): Promise<number> {
    const mikroCategories = await mikroService.getCategories();

    let count = 0;

    for (const mikroCat of mikroCategories) {
      await prisma.category.upsert({
        where: { mikroCode: mikroCat.code },
        update: {
          name: mikroCat.name,
          active: true,
        },
        create: {
          mikroCode: mikroCat.code,
          name: mikroCat.name,
          active: true,
        },
      });
      count++;
    }

    return count;
  }

  /**
   * Ürünleri ERP'den çek ve sync et
   */
  private async syncProducts(): Promise<number> {
    const [mikroProducts, salesHistory, pendingOrdersByWarehouse] = await Promise.all([
      mikroService.getProducts(),
      mikroService.getSalesHistory(),
      mikroService.getPendingOrdersByWarehouse(),
    ]);

    console.log(`📊 ERP'den ${mikroProducts.length} ürün çekildi`);

    if (mikroProducts.length > 0) {
      const mikroCodes = mikroProducts.map((product) => product.code);
      await prisma.product.updateMany({
        where: {
          active: true,
          mikroCode: { notIn: mikroCodes },
        },
        data: { active: false },
      });
    }

    let count = 0;
    let skippedNoCategory = 0;

    const categoryCodes = Array.from(
      new Set(mikroProducts.map((product) => product.categoryId).filter(Boolean))
    );
    const categories = await prisma.category.findMany({
      where: { mikroCode: { in: categoryCodes } },
    });
    const categoryMap = new Map(categories.map((category) => [category.mikroCode, category]));

    const salesHistoryMap = new Map<string, Record<string, number>>();
    for (const sale of salesHistory) {
      const productCode = String(sale.productCode || '').trim();
      if (!productCode) continue;

      const saleDate = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
      if (Number.isNaN(saleDate.getTime())) continue;

      const productSales = salesHistoryMap.get(productCode) || {};
      const key = saleDate.toISOString().split('T')[0];
      productSales[key] = (productSales[key] || 0) + (Number(sale.totalQuantity) || 0);
      salesHistoryMap.set(productCode, productSales);
    }

    const pendingMap = new Map<string, {
      sales: number;
      purchases: number;
      salesByWarehouse: Record<string, number>;
    }>();

    for (const pending of pendingOrdersByWarehouse) {
      const productCode = String(pending.productCode || '').trim();
      if (!productCode) continue;

      const entry = pendingMap.get(productCode) || {
        sales: 0,
        purchases: 0,
        salesByWarehouse: {},
      };

      const quantity = Math.max(0, Number(pending.quantity) || 0);
      if (pending.type === 'SALES') {
        entry.sales += quantity;
        const warehouseKey = String(pending.warehouseCode || '').trim();
        if (warehouseKey) {
          entry.salesByWarehouse[warehouseKey] = (entry.salesByWarehouse[warehouseKey] || 0) + quantity;
        }
      } else {
        entry.purchases += quantity;
      }

      pendingMap.set(productCode, entry);
    }

    for (const mikroProduct of mikroProducts) {
      // Kategorisini bul
      const category = categoryMap.get(mikroProduct.categoryId);

      if (!category) {
        console.warn(`⚠️ Kategori bulunamadı: ${mikroProduct.categoryId} (Ürün: ${mikroProduct.code})`);
        continue;
      }

      // Depo stokları zaten mikroProduct.warehouseStocks içinde geliyor
      const warehouseStocksJson = mikroProduct.warehouseStocks || {};
      const unit2 = mikroProduct.unit2?.trim() || null;
      const rawUnit2Factor = Number(mikroProduct.unit2Factor);
      const unit2Factor = Number.isFinite(rawUnit2Factor) && rawUnit2Factor !== 0 ? rawUnit2Factor : null;

      // Satış geçmişini topla (günlük)
      const salesHistoryJson = salesHistoryMap.get(mikroProduct.code) || {};

      // Bekleyen siparişleri topla
      const pendingEntry = pendingMap.get(mikroProduct.code);
      const pendingSales = pendingEntry?.sales || 0;
      const pendingPurchases = pendingEntry?.purchases || 0;
      const pendingSalesByWarehouse = pendingEntry?.salesByWarehouse || {};

      // Tarihleri parse et
      const parsedCurrentCostDate = this.parseDateString(mikroProduct.currentCostDate);

      // Ürünü upsert et
        await prisma.product.upsert({
          where: { mikroCode: mikroProduct.code },
          update: {
            name: mikroProduct.name,
            foreignName: mikroProduct.foreignName || null,
            brandCode: mikroProduct.brandCode || null,
            unit: mikroProduct.unit,
            unit2,
            unit2Factor,
          categoryId: category.id,
          lastEntryPrice: mikroProduct.lastEntryPrice,
          lastEntryDate: mikroProduct.lastEntryDate,
          currentCost: mikroProduct.currentCost,
          currentCostDate: parsedCurrentCostDate,
          vatRate: mikroProduct.vatRate,
          warehouseStocks: warehouseStocksJson,
          salesHistory: salesHistoryJson,
          pendingCustomerOrders: pendingSales,
          pendingPurchaseOrders: pendingPurchases,
          pendingCustomerOrdersByWarehouse: pendingSalesByWarehouse,
          active: true,
        },
          create: {
            mikroCode: mikroProduct.code,
            name: mikroProduct.name,
            foreignName: mikroProduct.foreignName || null,
            brandCode: mikroProduct.brandCode || null,
            unit: mikroProduct.unit,
            unit2,
            unit2Factor,
          categoryId: category.id,
          lastEntryPrice: mikroProduct.lastEntryPrice,
          lastEntryDate: mikroProduct.lastEntryDate,
          currentCost: mikroProduct.currentCost,
          currentCostDate: parsedCurrentCostDate,
          vatRate: mikroProduct.vatRate,
          warehouseStocks: warehouseStocksJson,
          salesHistory: salesHistoryJson,
          pendingCustomerOrders: pendingSales,
          pendingPurchaseOrders: pendingPurchases,
          pendingCustomerOrdersByWarehouse: pendingSalesByWarehouse,
          excessStock: 0,
          prices: {},
          active: true,
        },
      });

      count++;
    }

    return count;
  }

  /**
   * Tek bir ürünü sync et (anlık güncelleme için)
   */
  async syncSingleProduct(productId: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // ERP'den güncel veriyi çek
    const [warehouseStocks] = await Promise.all([
      mikroService.getWarehouseStocks(),
    ]);

    // Bu ürünün stoklarını güncelle
    const productStocks = warehouseStocks.filter((s) => s.productCode === product.mikroCode);
    const warehouseStocksJson: Record<string, number> = {};
    productStocks.forEach((s) => {
      warehouseStocksJson[s.warehouseCode] = s.quantity;
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        warehouseStocks: warehouseStocksJson,
      },
    });

    // Fazla stok hesapla
    await stockService.calculateExcessStock(productId);
  }

  /**
   * Resim senkronizasyonunu başlat ve log ID döndür
   */
  async startImageSync(): Promise<string> {
    // Sync log oluştur
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'MANUAL',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Arka planda resim sync'i çalıştır (await etme!)
    this.runImageSync(syncLog.id).catch((error) => {
      console.error('❌ Background image sync error:', error);
    });

    return syncLog.id;
  }

  async startImageSyncForProducts(productIds: string[]): Promise<string> {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'MANUAL',
        status: 'RUNNING',
        startedAt: new Date(),
        details: {
          scope: 'SELECTED',
          selectedCount: productIds.length,
        },
      },
    });

    this.runImageSyncForProducts(productIds, syncLog.id).catch((error) => {
      console.error('Background selected image sync error:', error);
    });

    return syncLog.id;
  }

  async runImageSyncForProducts(
    productIds: string[],
    syncLogId: string
  ): Promise<{
    success: boolean;
    stats: {
      downloaded: number;
      skipped: number;
      failed: number;
    };
    error?: string;
  }> {
    try {
      console.log('Secili urunler icin resim senkronu basliyor...');

      const productsForImageSync = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          active: true,
          imageUrl: null,
        },
        select: {
          id: true,
          mikroCode: true,
          name: true,
          imageUrl: true,
        },
      });

      if (productsForImageSync.length === 0) {
        await prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'SUCCESS',
            imagesDownloaded: 0,
            imagesSkipped: 0,
            imagesFailed: 0,
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          stats: {
            downloaded: 0,
            skipped: 0,
            failed: 0,
          },
        };
      }

      const codes = productsForImageSync.map((product) => product.mikroCode);
      const guidRows = await mikroService.getProductGuidsByCodes(codes);
      const guidMap = new Map(guidRows.map((row) => [row.code, row.guid]));

      const productsWithGuid = productsForImageSync
        .map((product) => ({
          ...product,
          guid: guidMap.get(product.mikroCode),
        }))
        .filter((product) => product.guid);

      const productsMissingGuid = productsForImageSync.filter(
        (product) => !guidMap.get(product.mikroCode)
      );

      if (productsMissingGuid.length > 0) {
        await prisma.product.updateMany({
          where: { id: { in: productsMissingGuid.map((product) => product.id) } },
          data: {
            imageSyncStatus: 'SKIPPED',
            imageSyncErrorType: 'NO_GUID',
            imageSyncErrorMessage: 'GUID bulunamadi',
            imageSyncUpdatedAt: new Date(),
            imageChecksum: null,
          },
        });
      }

      const imageStats = await imageService.syncAllImages(productsWithGuid as any, syncLogId);
      const missingGuidWarnings = productsMissingGuid.slice(0, 50).map((product) => ({
        type: 'NO_GUID',
        productCode: product.mikroCode,
        productName: product.name,
        message: 'GUID bulunamadi',
      }));

      const warnings = [...imageStats.warnings, ...missingGuidWarnings];
      const skippedTotal = imageStats.skipped + productsMissingGuid.length;

      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'SUCCESS',
          categoriesCount: 0,
          productsCount: 0,
          imagesDownloaded: imageStats.downloaded,
          imagesSkipped: skippedTotal,
          imagesFailed: imageStats.failed,
          warnings: warnings.length > 0 ? warnings : undefined,
          completedAt: new Date(),
        },
      });

      console.log('Secili resim senkronu tamamlandi!');

      return {
        success: true,
        stats: {
          downloaded: imageStats.downloaded,
          skipped: skippedTotal,
          failed: imageStats.failed,
        },
      };
    } catch (error: any) {
      console.error('Secili resim senkronu hatasi:', error);

      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        stats: {
          downloaded: 0,
          skipped: 0,
          failed: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * Sadece resim senkronizasyonunu çalıştır
   */
  async runImageSync(syncLogId: string): Promise<{
    success: boolean;
    stats: {
      downloaded: number;
      skipped: number;
      failed: number;
    };
    error?: string;
  }> {
    try {
      console.log('📸 Resim senkronizasyonu başlıyor...');

      // Sadece resmi olmayan ürünleri getir
      const productsForImageSync = await prisma.product.findMany({
        where: {
          active: true,
          imageUrl: null, // Sadece resmi olmayanları çek
        },
        select: {
          id: true,
          mikroCode: true,
          name: true,
          imageUrl: true,
        },
      });

      console.log(`📊 ${productsForImageSync.length} ürün için resim sync edilecek`);

      const codes = productsForImageSync.map((product) => product.mikroCode);
      const guidRows = await mikroService.getProductGuidsByCodes(codes);
      const guidMap = new Map(guidRows.map((row) => [row.code, row.guid]));

      const productsWithGuid = productsForImageSync
        .map((product) => ({
          ...product,
          guid: guidMap.get(product.mikroCode),
        }))
        .filter((product) => product.guid);

      const productsMissingGuid = productsForImageSync.filter(
        (product) => !guidMap.get(product.mikroCode)
      );

      if (productsMissingGuid.length > 0) {
        await prisma.product.updateMany({
          where: { id: { in: productsMissingGuid.map((product) => product.id) } },
          data: {
            imageSyncStatus: 'SKIPPED',
            imageSyncErrorType: 'NO_GUID',
            imageSyncErrorMessage: 'GUID bulunamadi',
            imageSyncUpdatedAt: new Date(),
            imageChecksum: null,
          },
        });
      }

      console.log(`✅ ${productsWithGuid.length} ürün için GUID bulundu`);

      // Resimleri sync et
      const imageStats = await imageService.syncAllImages(productsWithGuid as any, syncLogId);
      const missingGuidWarnings = productsMissingGuid.slice(0, 50).map((product) => ({
        type: 'NO_GUID',
        productCode: product.mikroCode,
        productName: product.name,
        message: 'GUID bulunamadi',
      }));

      const warnings = [...imageStats.warnings, ...missingGuidWarnings];
      const skippedTotal = imageStats.skipped + productsMissingGuid.length;

      // Sync log güncelle (warnings ile birlikte)
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'SUCCESS',
          categoriesCount: 0,
          productsCount: 0,
          imagesDownloaded: imageStats.downloaded,
          imagesSkipped: skippedTotal,
          imagesFailed: imageStats.failed,
          warnings: warnings.length > 0 ? warnings : undefined,
          completedAt: new Date(),
        },
      });

      console.log('🎉 Resim senkronizasyonu tamamlandı!');
      console.log(`  ✅ İndirilen: ${imageStats.downloaded}`);
      console.log(`  ⏭️ Atlanan: ${skippedTotal}`);
      console.log(`  ❌ Başarısız: ${imageStats.failed}`);

      return {
        success: true,
        stats: {
          downloaded: imageStats.downloaded,
          skipped: skippedTotal,
          failed: imageStats.failed,
        },
      };
    } catch (error: any) {
      console.error('❌ Resim senkronizasyon hatası:', error);

      // Sync log'u hata olarak güncelle
      await prisma.syncLog.update({
        where: { id: syncLogId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      return {
        success: false,
        stats: {
          downloaded: 0,
          skipped: 0,
          failed: 0,
        },
        error: error.message,
      };
    }
  }
}

export default new SyncService();
