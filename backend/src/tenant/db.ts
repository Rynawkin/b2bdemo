import { Prisma, Tenant } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { getTenantCatalog } from './catalog';
import { TenantConfig } from './types';

type TenantCacheRecord = Pick<Tenant, 'id' | 'slug' | 'name' | 'status' | 'domains'>;

const tenantCache = new Map<string, TenantCacheRecord>();
let bootstrapPromise: Promise<void> | null = null;

const toTenantPayload = (tenant: TenantConfig): Prisma.TenantUncheckedCreateInput => ({
  slug: tenant.slug,
  name: tenant.branding.companyName,
  status: tenant.status,
  domains: tenant.domains,
  branding: tenant.branding as unknown as Prisma.InputJsonValue,
  features: tenant.features as unknown as Prisma.InputJsonValue,
  integrations: tenant.integrations as unknown as Prisma.InputJsonValue,
});

const toTenantCacheRecord = (tenant: Tenant): TenantCacheRecord => ({
  id: tenant.id,
  slug: tenant.slug,
  name: tenant.name,
  status: tenant.status,
  domains: tenant.domains,
});

export const ensureTenantRecord = async (tenant: TenantConfig): Promise<TenantCacheRecord> => {
  const existing = tenantCache.get(tenant.slug);
  if (existing) {
    return existing;
  }

  const payload = toTenantPayload(tenant);
  const record = await prisma.tenant.upsert({
    where: { slug: tenant.slug },
    update: {
      name: payload.name,
      status: payload.status,
      domains: payload.domains,
      branding: payload.branding,
      features: payload.features,
      integrations: payload.integrations,
    },
    create: payload,
  });

  const cached = toTenantCacheRecord(record);
  tenantCache.set(cached.slug, cached);
  return cached;
};

export const bootstrapTenantCatalog = async (): Promise<void> => {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const tenants = Object.values(getTenantCatalog());
      for (const tenant of tenants) {
        await ensureTenantRecord(tenant);
      }
    })().finally(() => {
      bootstrapPromise = null;
    });
  }

  await bootstrapPromise;
};

export const getTenantRecordBySlug = async (slug: string): Promise<TenantCacheRecord | null> => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const existing = tenantCache.get(normalizedSlug);
  if (existing) {
    return existing;
  }

  const record = await prisma.tenant.findUnique({
    where: { slug: normalizedSlug },
  });

  if (!record) {
    return null;
  }

  const cached = toTenantCacheRecord(record);
  tenantCache.set(cached.slug, cached);
  return cached;
};
