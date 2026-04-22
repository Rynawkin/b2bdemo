import { PrismaClient } from '@prisma/client';
import { getTenantContext } from '../tenant/context';

const tenantScopedModels = new Set([
  'User',
  'UserSearchPreferences',
  'CustomerActivityEvent',
  'RolePermission',
  'Settings',
  'VadeBalance',
  'VadeNote',
  'VadeClassification',
  'VadeAssignment',
  'VadeSyncLog',
  'EInvoiceDocument',
  'Category',
  'Product',
  'ProductComplementAuto',
  'ProductComplementManual',
  'Supplier',
  'SupplierPriceListUpload',
  'SupplierPriceListFile',
  'SupplierPriceListItem',
  'SupplierPriceListMatch',
  'CategoryPriceRule',
  'ProductPriceOverride',
  'CustomerPriceListRule',
  'Cart',
  'CartItem',
  'Order',
  'OrderItem',
  'CustomerPriceAgreement',
  'CustomerRequest',
  'CustomerRequestItem',
  'Quote',
  'QuoteItem',
  'QuoteHistory',
  'CustomerContact',
  'SyncLog',
  'Campaign',
  'OrderTrackingSettings',
  'PendingMikroOrder',
  'SupplierTransmissionLog',
  'ProductFamily',
  'ProductFamilyItem',
  'WarehouseOrderWorkflow',
  'WarehouseOrderWorkflowItem',
  'WarehouseShelfLocation',
  'WarehouseDispatchDriver',
  'WarehouseDispatchVehicle',
  'WarehouseImageIssueReport',
  'EmailLog',
  'ReportExclusion',
  'Task',
  'TaskComment',
  'TaskAttachment',
  'TaskLink',
  'TaskStatusHistory',
  'TaskTemplate',
  'Notification',
]);

const withTenantWhere = (args: any, tenantId?: string) => {
  if (!tenantId) {
    return args;
  }

  const where = args?.where || {};
  return {
    ...args,
    where: {
      AND: [
        where,
        {
          OR: [
            { tenantId },
            { tenantId: null },
          ],
        },
      ],
    },
  };
};

const withTenantData = (args: any, tenantId?: string) => {
  if (!tenantId) {
    return args;
  }

  if (Array.isArray(args?.data)) {
    return {
      ...args,
      data: args.data.map((item: Record<string, unknown>) => ({
        tenantId,
        ...item,
      })),
    };
  }

  if (!args?.data || typeof args.data !== 'object') {
    return args;
  }

  return {
    ...args,
    data: {
      tenantId,
      ...args.data,
    },
  };
};

const withTenantUpsert = (args: any, tenantId?: string) => {
  if (!tenantId) {
    return args;
  }

  return {
    ...args,
    create: {
      tenantId,
      ...(args?.create || {}),
    },
    update: args?.update || {},
  };
};

const basePrisma =
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantWhere(args, getTenantContext()?.tenantId) : args);
      },
      async findFirst({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantWhere(args, getTenantContext()?.tenantId) : args);
      },
      async count({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantWhere(args, getTenantContext()?.tenantId) : args);
      },
      async aggregate({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantWhere(args, getTenantContext()?.tenantId) : args);
      },
      async create({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantData(args, getTenantContext()?.tenantId) : args);
      },
      async createMany({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantData(args, getTenantContext()?.tenantId) : args);
      },
      async updateMany({ model, args, query }) {
        if (!tenantScopedModels.has(model)) {
          return query(args);
        }

        return query(withTenantData(withTenantWhere(args, getTenantContext()?.tenantId), getTenantContext()?.tenantId));
      },
      async deleteMany({ model, args, query }) {
        return query(tenantScopedModels.has(model) ? withTenantWhere(args, getTenantContext()?.tenantId) : args);
      },
      async upsert({ model, args, query }) {
        if (!tenantScopedModels.has(model)) {
          return query(args);
        }

        return query(withTenantUpsert(args, getTenantContext()?.tenantId));
      },
    },
  },
});

type ExtendedPrismaClient = typeof extendedPrisma;

const globalForPrisma = global as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma || extendedPrisma;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
