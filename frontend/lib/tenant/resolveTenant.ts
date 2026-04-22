import { TenantPublicConfig } from './types';

const runtimeHostMap: Record<string, string> = {
  'bakircilarkampanya.com': 'bakircilar',
  'www.bakircilarkampanya.com': 'bakircilar',
};

const defaultTenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'platform';

export const defaultTenant: TenantPublicConfig = {
  slug: defaultTenantSlug,
  status: 'active',
  branding: {
    companyName: 'B2B Platform',
    legalName: 'B2B Platform',
    shortName: 'B2B Platform',
    customerPortalName: 'B2B Musteri Portali',
    staffPortalName: 'B2B Yonetim Portali',
    emailFromName: 'B2B Platform',
    supportEmail: 'support@example.com',
    supportPhone: '',
    websiteUrl: '',
    logoPath: '/logo.png',
    quoteLogoPath: '/quote-logo.png',
    loginTitle: 'B2B Platform',
    loginSubtitle: 'Siparis ve operasyon yonetimi',
    copyrightName: 'B2B Platform',
  },
  features: {
    vade: true,
    eInvoice: true,
    warehouse: true,
    supplierPriceLists: true,
    customerActivity: true,
    diverseyStock: false,
    ucarerReports: false,
  },
  integrations: {
    erp: 'mikro',
    defaultCurrency: 'TRY',
    warehouse: {
      labels: {
        '1': 'Merkez',
      },
      includedWarehouseCodes: ['1'],
      defaultResponsibilityCenter: '',
    },
  },
};

export const resolveTenantSlugFromHostname = (hostname?: string | null): string => {
  const normalizedHost = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');

  if (!normalizedHost) {
    return defaultTenant.slug;
  }

  return runtimeHostMap[normalizedHost] || defaultTenant.slug;
};

export const getRuntimeTenantSlug = (): string => {
  if (typeof window === 'undefined') {
    return defaultTenant.slug;
  }

  return resolveTenantSlugFromHostname(window.location.hostname);
};

export const getTenantRequestHeaders = (): Record<string, string> => ({
  'x-tenant-slug': getRuntimeTenantSlug(),
});
