import { TenantConfig, TenantPublicConfig } from './types';

const splitCsv = (value?: string): string[] =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const unique = (values: string[]): string[] => Array.from(new Set(values.map((item) => item.toLowerCase())));

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'platform';

const platformTenant: TenantConfig = {
  slug: 'platform',
  status: 'active',
  domains: unique([
    ...splitCsv(process.env.TENANT_PLATFORM_DOMAINS),
    'localhost',
    '127.0.0.1',
  ]),
  branding: {
    companyName: 'B2B Platform',
    legalName: 'B2B Platform',
    shortName: 'B2B Platform',
    customerPortalName: 'B2B Musteri Portali',
    staffPortalName: 'B2B Yonetim Portali',
    emailFromName: 'B2B Platform',
    supportEmail: process.env.DEFAULT_SUPPORT_EMAIL || 'support@example.com',
    supportPhone: process.env.DEFAULT_SUPPORT_PHONE || '',
    websiteUrl: process.env.DEFAULT_WEBSITE_URL || '',
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
      defaultResponsibilityCenter: process.env.MIKRO_SORMERK || '',
    },
  },
};

const bakircilarTenant: TenantConfig = {
  slug: 'bakircilar',
  status: 'active',
  domains: unique([
    ...splitCsv(process.env.TENANT_BAKIRCILAR_DOMAINS),
    'bakircilarkampanya.com',
    'www.bakircilarkampanya.com',
  ]),
  branding: {
    companyName: 'Bakircilar Grup',
    legalName: 'BAKIRCILAR AMBALAJ END.-TEM VE KIRTASIYE',
    shortName: 'Bakircilar',
    customerPortalName: 'Bakircilar B2B',
    staffPortalName: 'Bakircilar Portal',
    emailFromName: 'Bakircilar B2B',
    supportEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@bakircilar.com',
    supportPhone: '0264 614 67 77',
    websiteUrl: 'https://www.bakircilargrup.com',
    logoPath: '/logo.png',
    quoteLogoPath: '/quote-logo.png',
    loginTitle: 'Bakircilar Grup',
    loginSubtitle: 'B2B Siparis Sistemi',
    copyrightName: 'Bakircilar Grup',
  },
  features: {
    vade: true,
    eInvoice: true,
    warehouse: true,
    supplierPriceLists: true,
    customerActivity: true,
    diverseyStock: true,
    ucarerReports: true,
  },
  integrations: {
    erp: 'mikro',
    defaultCurrency: 'TRY',
    warehouse: {
      labels: {
        '1': 'Merkez',
        '2': 'Eregli',
        '6': 'Topca',
        '7': 'Dukkan',
      },
      includedWarehouseCodes: ['1', '2', '6', '7'],
      defaultResponsibilityCenter: process.env.MIKRO_SORMERK || 'HENDEK',
    },
  },
};

const tenantCatalog: Record<string, TenantConfig> = {
  [platformTenant.slug]: platformTenant,
  [bakircilarTenant.slug]: bakircilarTenant,
};

export const getTenantCatalog = (): Record<string, TenantConfig> => tenantCatalog;

export const getDefaultTenantSlug = (): string =>
  tenantCatalog[DEFAULT_TENANT_SLUG] ? DEFAULT_TENANT_SLUG : platformTenant.slug;

export const getTenantConfigBySlug = (slug?: string | null): TenantConfig => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (normalizedSlug && tenantCatalog[normalizedSlug]) {
    return tenantCatalog[normalizedSlug];
  }

  return tenantCatalog[getDefaultTenantSlug()];
};

export const getTenantConfigByHost = (host?: string | null): TenantConfig => {
  const normalizedHost = String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');

  if (!normalizedHost) {
    return getTenantConfigBySlug();
  }

  const found = Object.values(tenantCatalog).find((tenant) =>
    tenant.domains.some((domain) => domain === normalizedHost)
  );

  return found || getTenantConfigBySlug();
};

export const toTenantPublicConfig = (tenant: TenantConfig): TenantPublicConfig => ({
  slug: tenant.slug,
  status: tenant.status,
  branding: tenant.branding,
  features: tenant.features,
  integrations: tenant.integrations,
});

export const getDefaultTenantPublicConfig = (): TenantPublicConfig =>
  toTenantPublicConfig(getTenantConfigBySlug(getDefaultTenantSlug()));
