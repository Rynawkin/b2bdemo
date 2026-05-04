import { TenantPublicConfig } from './types';

const runtimeHostMap: Record<string, string> = {
  'otoolgun.com': 'otoolgun',
  'www.otoolgun.com': 'otoolgun',
};

const defaultTenantSlug = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG || 'otoolgun';

export const defaultTenant: TenantPublicConfig = {
  slug: defaultTenantSlug,
  status: 'active',
  branding: {
    companyName: 'OtoOlgun',
    legalName: 'OTOOLGUN',
    shortName: 'OtoOlgun',
    customerPortalName: 'OtoOlgun B2B',
    staffPortalName: 'OtoOlgun Portal',
    emailFromName: 'OtoOlgun B2B',
    supportEmail: 'noreply@otoolgun.com',
    supportPhone: '',
    websiteUrl: '',
    logoPath: '/logo.png',
    quoteLogoPath: '/quote-logo.png',
    loginTitle: 'OtoOlgun',
    loginSubtitle: 'B2B Siparis Sistemi',
    copyrightName: 'OtoOlgun',
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
    erp: 'generic',
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
