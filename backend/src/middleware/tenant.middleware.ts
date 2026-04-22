import { NextFunction, Request, Response } from 'express';
import { getTenantConfigByHost, getTenantConfigBySlug } from '../tenant/catalog';
import { runWithTenantContext } from '../tenant/context';
import { ensureTenantRecord } from '../tenant/db';

const extractHostFromUrl = (value?: string | string[]): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return parsed.host || null;
  } catch {
    return raw;
  }
};

export const resolveTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const headerSlug = String(req.headers['x-tenant-slug'] || '').trim().toLowerCase();
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').trim();
    const hostHeader = String(req.headers.host || '').trim();
    const originHost = extractHostFromUrl(req.headers.origin);
    const refererHost = extractHostFromUrl(req.headers.referer);

    const tenant =
      (headerSlug && getTenantConfigBySlug(headerSlug)) ||
      getTenantConfigByHost(forwardedHost) ||
      getTenantConfigByHost(hostHeader) ||
      getTenantConfigByHost(originHost) ||
      getTenantConfigByHost(refererHost);

    const tenantRecord = await ensureTenantRecord(tenant);

    req.tenant = tenant;
    req.tenantId = tenantRecord.id;
    req.tenantRecord = tenantRecord;

    res.setHeader('x-tenant-slug', tenant.slug);
    res.setHeader('x-tenant-id', tenantRecord.id);

    runWithTenantContext({ tenantId: tenantRecord.id, tenantSlug: tenant.slug }, () => {
      next();
    });
  } catch (error) {
    next(error);
  }
};
