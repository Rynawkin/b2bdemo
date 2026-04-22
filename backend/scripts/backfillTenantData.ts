import { PrismaClient } from '@prisma/client';
import { getDefaultTenantSlug, getTenantConfigBySlug } from '../src/tenant/catalog';
import { ensureTenantRecord } from '../src/tenant/db';

const prisma = new PrismaClient();

const targetTenantSlug = process.env.TARGET_TENANT_SLUG || process.argv[2] || getDefaultTenantSlug();

async function backfillTenantData(): Promise<void> {
  const tenantConfig = getTenantConfigBySlug(targetTenantSlug);
  const tenantRecord = await ensureTenantRecord(tenantConfig);

  const results = await prisma.$transaction([
    prisma.user.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.userSearchPreferences.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerActivityEvent.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.rolePermission.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.settings.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.vadeBalance.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.vadeNote.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.vadeClassification.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.vadeAssignment.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.vadeSyncLog.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.eInvoiceDocument.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.category.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.product.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.productComplementAuto.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.productComplementManual.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplier.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplierPriceListUpload.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplierPriceListFile.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplierPriceListItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplierPriceListMatch.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.categoryPriceRule.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.productPriceOverride.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerPriceListRule.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.cart.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.cartItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.order.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.orderItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerPriceAgreement.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerRequest.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerRequestItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.quote.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.quoteItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.quoteHistory.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.customerContact.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.syncLog.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.campaign.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.orderTrackingSettings.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.pendingMikroOrder.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.supplierTransmissionLog.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.productFamily.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.productFamilyItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseOrderWorkflow.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseOrderWorkflowItem.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseShelfLocation.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseDispatchDriver.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseDispatchVehicle.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.warehouseImageIssueReport.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.emailLog.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.reportExclusion.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.task.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.taskComment.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.taskAttachment.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.taskLink.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.taskStatusHistory.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.taskTemplate.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
    prisma.notification.updateMany({ where: { tenantId: null }, data: { tenantId: tenantRecord.id } }),
  ]);

  const labels = [
    'users',
    'userSearchPreferences',
    'customerActivityEvents',
    'rolePermissions',
    'settings',
    'vadeBalances',
    'vadeNotes',
    'vadeClassifications',
    'vadeAssignments',
    'vadeSyncLogs',
    'eInvoiceDocuments',
    'categories',
    'products',
    'productComplementAuto',
    'productComplementManual',
    'suppliers',
    'supplierPriceListUploads',
    'supplierPriceListFiles',
    'supplierPriceListItems',
    'supplierPriceListMatches',
    'categoryPriceRules',
    'productPriceOverrides',
    'customerPriceListRules',
    'carts',
    'cartItems',
    'orders',
    'orderItems',
    'customerPriceAgreements',
    'customerRequests',
    'customerRequestItems',
    'quotes',
    'quoteItems',
    'quoteHistories',
    'customerContacts',
    'syncLogs',
    'campaigns',
    'orderTrackingSettings',
    'pendingMikroOrders',
    'supplierTransmissionLogs',
    'productFamilies',
    'productFamilyItems',
    'warehouseOrderWorkflows',
    'warehouseOrderWorkflowItems',
    'warehouseShelfLocations',
    'warehouseDispatchDrivers',
    'warehouseDispatchVehicles',
    'warehouseImageIssueReports',
    'emailLogs',
    'reportExclusions',
    'tasks',
    'taskComments',
    'taskAttachments',
    'taskLinks',
    'taskStatusHistories',
    'taskTemplates',
    'notifications',
  ];

  console.log('');
  console.log(`Tenant backfill completed for "${tenantRecord.slug}" (${tenantRecord.id})`);
  console.log('');

  labels.forEach((label, index) => {
    console.log(`${label}: ${results[index]?.count || 0}`);
  });
}

backfillTenantData()
  .catch((error) => {
    console.error('Tenant backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
