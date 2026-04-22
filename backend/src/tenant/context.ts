import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantRequestContext {
  tenantId?: string;
  tenantSlug?: string;
}

const tenantContextStorage = new AsyncLocalStorage<TenantRequestContext>();

export const runWithTenantContext = <T>(context: TenantRequestContext, callback: () => T): T =>
  tenantContextStorage.run(context, callback);

export const getTenantContext = (): TenantRequestContext | undefined => tenantContextStorage.getStore();
