import mikroFactory from './mikroFactory.service';

import prisma from '../utils/prisma';
import { config } from '../config';

interface CariHareketParams {
  cariKod: string;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string;   // YYYY-MM-DD format
}

interface CariSearchParams {
  searchTerm?: string;
  limit?: number;
}

const buildSqlSearchTokens = (value?: string) => {
  if (!value) return [] as string[];
  return value
    .replace(/\*/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

class CariHareketService {
  /**
   * Cari Hareket FÃ¶yÃ¼ (041410) - ERP'deki gibi tam detaylÄ± hareket listesi
   */
  async getCariHareketFoyu(params: CariHareketParams): Promise<any> {
    const { cariKod, startDate, endDate } = params;

    // EÄŸer tarih verilmemiÅŸse, bu yÄ±lÄ±n ilk ve son gÃ¼nÃ¼
    const currentYear = new Date().getFullYear();
    const defaultStartDate = startDate || `${currentYear}-01-01`;
    const defaultEndDate = endDate || `${currentYear}-12-31`;

    // SQL injection'dan korunmak iÃ§in parametreleri escape et
    const escapedCariKod = cariKod.replace(/'/g, "''");

    if (config.erpProvider === 'bayt') {
      const customer = await prisma.user.findFirst({
        where: { mikroCariCode: cariKod },
        select: { balance: true },
      });

      let rows: any[] = [];
      try {
        const sales = await mikroFactory.getCustomerSalesMovements(cariKod, [], 500);
        rows = sales
          .filter((sale: any) => {
            const date = sale.saleDate ? new Date(sale.saleDate) : null;
            if (!date || Number.isNaN(date.getTime())) return false;
            return date >= new Date(defaultStartDate) && date < new Date(`${defaultEndDate}T23:59:59`);
          })
          .map((sale: any) => ({
            Seri: '',
            Sira: sale.documentNo || '',
            'SÄ±ra': sale.documentNo || '',
            Tarih: sale.saleDate,
            'Belge No': sale.documentNo || '',
            'Evrak Tipi': 'Satis Faturasi',
            'Odeme Tipi': '',
            'Hareket Tipi': 'Alacak',
            'Tip Kodu': 1,
            Tutar: Number(sale.lineTotal) || 0,
          }));
      } catch (error) {
        console.warn('Bayt cari hareket satis hareketleri okunamadi:', error);
      }

      const balance = Number(customer?.balance) || 0;
      return {
        rows,
        opening: {
          borc: balance > 0 ? balance : 0,
          alacak: balance < 0 ? Math.abs(balance) : 0,
          bakiye: balance,
        },
      };
    }

    const openingQuery = `
      SELECT
        SUM(CASE WHEN cha_tip = 0 THEN cha_meblag ELSE 0 END) AS borc,
        SUM(CASE WHEN cha_tip = 1 THEN cha_meblag ELSE 0 END) AS alacak
      FROM dbo.CARI_HESAP_HAREKETLERI WITH (NOLOCK)
      WHERE cha_kod = '${escapedCariKod}'
        AND cha_create_date < '${defaultStartDate}'
    `;

    const openingResult = await mikroFactory.executeQuery(openingQuery);
    const openingBorc = Number(openingResult?.[0]?.borc) || 0;
    const openingAlacak = Number(openingResult?.[0]?.alacak) || 0;

    // Sadece gerekli kolonlarÄ± TÃ¼rkÃ§e baÅŸlÄ±klarla getir
    const query = `
      SELECT
        cha_evrakno_seri AS [Seri],
        cha_evrakno_sira AS [SÄ±ra],
        cha_tarihi AS [Tarih],
        cha_belge_no AS [Belge No],
        COALESCE(evrak.CHEvrUzunIsim, evrak.CHEvrKisaIsim) AS [Evrak Tipi],
        cins.CHCinsIsim AS [Odeme Tipi],
        tip.CHTipIsim AS [Hareket Tipi],
        cha_tip AS [Tip Kodu],
        cha_meblag AS [Tutar]
      FROM dbo.CARI_HESAP_HAREKETLERI WITH (NOLOCK)
      LEFT JOIN dbo.vw_Cari_Hareket_Evrak_Isimleri evrak ON evrak.CHEvrNo = cha_evrak_tip
      LEFT JOIN dbo.vw_Cari_Hareket_Cins_Isimleri cins ON cins.CHCinsNo = cha_cinsi
      LEFT JOIN dbo.vw_Cari_Hareket_Tip_Isimleri tip ON tip.CHTipNo = cha_tip
      WHERE cha_kod = '${escapedCariKod}'
        AND cha_create_date >= '${defaultStartDate}'
        AND cha_create_date < DATEADD(day, 1, '${defaultEndDate}')
      ORDER BY cha_tarihi
    `;

    const result = await mikroFactory.executeQuery(query);
    return {
      rows: result,
      opening: {
        borc: openingBorc,
        alacak: openingAlacak,
        bakiye: openingBorc - openingAlacak,
      },
    };
  }

  /**
   * Ekstre iÃ§in basitleÅŸtirilmiÅŸ cari arama
   * Sadece gerekli kolonlar: Kod, Ad, SektÃ¶r, Grup, Bakiye
   */
  async searchCariForEkstre(params: CariSearchParams = {}): Promise<any> {
    const { searchTerm, limit = 100 } = params;

    if (config.erpProvider === 'bayt') {
      const tokens = buildSqlSearchTokens(searchTerm);
      const customers = await prisma.user.findMany({
        where: {
          role: 'CUSTOMER',
          mikroCariCode: { not: null },
          ...(tokens.length > 0
            ? {
                AND: tokens.map((token) => ({
                  OR: [
                    { mikroCariCode: { contains: token, mode: 'insensitive' as const } },
                    { name: { contains: token, mode: 'insensitive' as const } },
                    { mikroName: { contains: token, mode: 'insensitive' as const } },
                    { displayName: { contains: token, mode: 'insensitive' as const } },
                  ],
                })),
              }
            : {}),
        },
        select: {
          mikroCariCode: true,
          name: true,
          mikroName: true,
          displayName: true,
          sectorCode: true,
          groupCode: true,
          balance: true,
        },
        orderBy: [{ displayName: 'asc' }, { name: 'asc' }],
        take: Math.max(1, Math.min(Number(limit) || 100, 500)),
      });

      return customers.map((customer) => ({
        'Cari Kodu': customer.mikroCariCode,
        'Cari Adi': customer.displayName || customer.mikroName || customer.name,
        'Cari AdÄ±': customer.displayName || customer.mikroName || customer.name,
        'Vergi No': '',
        'Sektor Kodu': customer.sectorCode || '',
        'SektÃ¶r Kodu': customer.sectorCode || '',
        'Grup Kodu': customer.groupCode || '',
        Bakiye: customer.balance || 0,
      }));
    }

    let whereClause = "cari_grup_kodu NOT LIKE 'FATURA' and cari_sektor_kodu NOT LIKE 'FATURA' and cari_sektor_kodu NOT LIKE 'DÄ°ÄER' and cari_grup_kodu NOT LIKE 'DÄ°ÄER'";

    if (searchTerm && searchTerm.trim()) {
      const tokens = buildSqlSearchTokens(searchTerm);
      if (tokens.length > 0) {
        const tokenClauses = tokens.map((token) => {
          const escaped = token.replace(/'/g, "''");
          return `(cari_unvan1 LIKE '%${escaped}%' OR cari_kod LIKE '%${escaped}%' OR cari_unvan2 LIKE '%${escaped}%')`;
        });
        whereClause += ` AND ${tokenClauses.join(' AND ')}`;
      }
    }

    const query = `
      SELECT TOP ${limit}
        cari_kod AS [Cari Kodu],
        cari_unvan1 AS [Cari AdÄ±],
        cari_vdaire_no AS [Vergi No],
        cari_sektor_kodu AS [SektÃ¶r Kodu],
        cari_grup_kodu AS [Grup Kodu],
        CAST(0 AS DECIMAL(18,2)) AS [Bakiye]
      FROM
        dbo.CARI_HESAPLAR WITH (NOLOCK)
      WHERE
        ${whereClause}
      ORDER BY
        cari_unvan1
    `;

    const result = await mikroFactory.executeQuery(query);
    return result;
  }

  /**
   * Cari bilgilerini getir (ekstre baÅŸlÄ±ÄŸÄ± iÃ§in)
   */
  async getCariInfo(cariKod: string): Promise<any> {
    const escapedCariKod = cariKod.replace(/'/g, "''");

    if (config.erpProvider === 'bayt') {
      const customer = await prisma.user.findFirst({
        where: { mikroCariCode: cariKod },
        select: {
          mikroCariCode: true,
          name: true,
          mikroName: true,
          displayName: true,
          sectorCode: true,
          groupCode: true,
          balance: true,
        },
      });

      if (!customer) return null;
      const name = customer.displayName || customer.mikroName || customer.name;
      return {
        'Cari Kodu': customer.mikroCariCode,
        'Cari Adi': name,
        'Cari AdÄ±': name,
        'Cari Adi 2': '',
        'Cari AdÄ± 2': '',
        'Sektor Kodu': customer.sectorCode || '',
        'SektÃ¶r Kodu': customer.sectorCode || '',
        'Grup Kodu': customer.groupCode || '',
        'Vergi Dairesi': '',
        'Vergi No': '',
        Bakiye: customer.balance || 0,
      };
    }

    const query = `
      SELECT
        cari_kod AS [Cari Kodu],
        cari_unvan1 AS [Cari AdÄ±],
        cari_unvan2 AS [Cari AdÄ± 2],
        cari_sektor_kodu AS [SektÃ¶r Kodu],
        cari_grup_kodu AS [Grup Kodu],
        cari_vdaire_adi AS [Vergi Dairesi],
        cari_vdaire_no AS [Vergi No],
        dbo.fn_CariRiskFoyu(cari_kod, 0) AS [Bakiye]
      FROM
        dbo.CARI_HESAPLAR WITH (NOLOCK)
      WHERE
        cari_kod = '${escapedCariKod}'
    `;

    const result = await mikroFactory.executeQuery(query);
    return result.length > 0 ? result[0] : null;
  }
}

export const cariHareketService = new CariHareketService();
