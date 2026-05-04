/**
 * Cari Sync Service
 *
 * ERP'den cari bilgilerini çekip PostgreSQL'e senkronize eder
 */

import { prisma } from '../utils/prisma';
import mikroService from './mikroFactory.service';

interface CariSyncResult {
  syncId: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: Date;
  completedAt?: Date;
  stats: {
    totalCari: number;
    updatedUsers: number;
    notFoundInB2B: number;
  };
  errors: string[];
  warnings: string[];
}

class CariSyncService {
  // In-memory storage for sync results (last 10 syncs)
  private syncResults: Map<string, CariSyncResult> = new Map();

  /**
   * Cari senkronizasyonunu başlat ve log ID döndür
   */
  async startCariSync(): Promise<string> {
    const syncId = `cari-sync-${Date.now()}`;

    // Initialize sync result
    const result: CariSyncResult = {
      syncId,
      status: 'RUNNING',
      startedAt: new Date(),
      stats: {
        totalCari: 0,
        updatedUsers: 0,
        notFoundInB2B: 0,
      },
      errors: [],
      warnings: [],
    };

    this.syncResults.set(syncId, result);

    // Keep only last 10 sync results
    if (this.syncResults.size > 10) {
      const firstKey = this.syncResults.keys().next().value;
      if (firstKey) {
        this.syncResults.delete(firstKey);
      }
    }

    console.log(`🔄 Cari senkronizasyonu başladı: ${syncId}`);

    // Arka planda sync'i çalıştır
    this.runCariSync(syncId).catch((error) => {
      console.error('❌ Cari sync hatası:', error);
      const result = this.syncResults.get(syncId);
      if (result) {
        result.status = 'FAILED';
        result.completedAt = new Date();
        result.errors.push(error.message);
      }
    });

    return syncId;
  }

  /**
   * Get sync result by ID
   */
  getSyncResult(syncId: string): CariSyncResult | undefined {
    return this.syncResults.get(syncId);
  }

  /**
   * Get latest sync result
   */
  getLatestSyncResult(): CariSyncResult | undefined {
    const results = Array.from(this.syncResults.values());
    return results[results.length - 1];
  }

  /**
   * Cari senkronizasyonu çalıştır
   */
  async runCariSync(syncId: string): Promise<{
    success: boolean;
    stats: {
      totalCari: number;
      updatedUsers: number;
      notFoundInB2B: number;
    };
    error?: string;
  }> {
    const startTime = new Date();
    const result = this.syncResults.get(syncId);

    try {
      console.log('🔄 Cari bilgileri Mikro\'dan çekiliyor...');

      // ERP'den cari bilgilerini çek
      const mikroCaris = await mikroService.getCariDetails();
      console.log(`✅ ${mikroCaris.length} cari bilgisi çekildi`);

      if (result) {
        result.stats.totalCari = mikroCaris.length;
      }

      let updatedUsers = 0;
      let notFoundInB2B = 0;

      // Her cari için B2B sisteminde user var mı kontrol et ve güncelle
      for (const cari of mikroCaris) {
        try {
          const user = await prisma.user.findUnique({
            where: { mikroCariCode: cari.code },
          });

          if (user) {
            // Kullanıcı varsa bilgilerini güncelle
            await prisma.user.update({
              where: { id: user.id },
              data: {
                name: cari.name, // İsim güncellenebilir
                city: cari.city,
                district: cari.district,
                phone: cari.phone,
                isLocked: cari.isLocked,
                groupCode: cari.groupCode,
                sectorCode: cari.sectorCode,
                paymentTerm: cari.paymentTerm,
                paymentPlanNo: cari.paymentPlanNo ?? null,
                paymentPlanCode: cari.paymentPlanCode ?? null,
                paymentPlanName: cari.paymentPlanName ?? null,
                hasEInvoice: cari.hasEInvoice,
                balance: cari.balance,
                balanceUpdatedAt: new Date(),
              },
            });

            updatedUsers++;

            if (result) {
              result.stats.updatedUsers = updatedUsers;
            }

            if (updatedUsers % 10 === 0) {
              console.log(`  📊 İlerleme: ${updatedUsers} kullanıcı güncellendi`);
            }
          } else {
            notFoundInB2B++;
            if (result) {
              result.stats.notFoundInB2B = notFoundInB2B;
              // Add warning for caris not found in B2B
              if (notFoundInB2B <= 5) {
                result.warnings.push(`Cari ${cari.code} (${cari.name}) B2B sisteminde bulunamadı`);
              }
            }
          }
        } catch (itemError: any) {
          console.error(`❌ Cari ${cari.code} güncellenirken hata:`, itemError);
          if (result) {
            result.errors.push(`${cari.code}: ${itemError.message}`);
          }
        }
      }

      const duration = (new Date().getTime() - startTime.getTime()) / 1000;

      console.log('🎉 Cari senkronizasyonu tamamlandı!');
      console.log(`  ✅ Toplam cari: ${mikroCaris.length}`);
      console.log(`  ✅ Güncellenen kullanıcı: ${updatedUsers}`);
      console.log(`  ⏭️ B2B'de bulunamayan: ${notFoundInB2B}`);
      console.log(`  ⏱️ Süre: ${duration.toFixed(1)}s`);

      // Update result status
      if (result) {
        result.status = 'SUCCESS';
        result.completedAt = new Date();
        if (notFoundInB2B > 5) {
          result.warnings.push(`... ve ${notFoundInB2B - 5} cari daha B2B'de bulunamadı`);
        }
      }

      return {
        success: true,
        stats: {
          totalCari: mikroCaris.length,
          updatedUsers,
          notFoundInB2B,
        },
      };
    } catch (error: any) {
      console.error('❌ Cari senkronizasyon hatası:', error);

      if (result) {
        result.status = 'FAILED';
        result.completedAt = new Date();
        result.errors.push(error.message);
      }

      return {
        success: false,
        stats: {
          totalCari: 0,
          updatedUsers: 0,
          notFoundInB2B: 0,
        },
        error: error.message,
      };
    }
  }
}

export default new CariSyncService();
