-- Manual migration for tenant scaffolding.
-- This migration was written by hand because generating a shadow-database-backed diff
-- was not possible in the current environment.

CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branding" JSONB,
    "features" JSONB,
    "integrations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "UserSearchPreferences" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerActivityEvent" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "RolePermission" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VadeBalance" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VadeNote" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VadeClassification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VadeAssignment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VadeSyncLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EInvoiceDocument" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductComplementAuto" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductComplementManual" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SupplierPriceListUpload" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SupplierPriceListFile" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SupplierPriceListItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SupplierPriceListMatch" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CategoryPriceRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductPriceOverride" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerPriceListRule" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Cart" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerPriceAgreement" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerRequestItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "QuoteHistory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CustomerContact" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "OrderTrackingSettings" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PendingMikroOrder" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "suppliertransmissionlog" ADD COLUMN IF NOT EXISTS "tenantid" TEXT;
ALTER TABLE "ProductFamily" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ProductFamilyItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseOrderWorkflow" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseOrderWorkflowItem" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseShelfLocation" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseDispatchDriver" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseDispatchVehicle" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "WarehouseImageIssueReport" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ReportExclusion" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaskComment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaskAttachment" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaskLink" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaskStatusHistory" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaskTemplate" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

DROP INDEX IF EXISTS "RolePermission_role_permission_key";
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_tenantId_role_permission_key" ON "RolePermission"("tenantId", "role", "permission");

CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "UserSearchPreferences_tenantId_idx" ON "UserSearchPreferences"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerActivityEvent_tenantId_idx" ON "CustomerActivityEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");
CREATE INDEX IF NOT EXISTS "Settings_tenantId_idx" ON "Settings"("tenantId");
CREATE INDEX IF NOT EXISTS "VadeBalance_tenantId_idx" ON "VadeBalance"("tenantId");
CREATE INDEX IF NOT EXISTS "VadeNote_tenantId_idx" ON "VadeNote"("tenantId");
CREATE INDEX IF NOT EXISTS "VadeClassification_tenantId_idx" ON "VadeClassification"("tenantId");
CREATE INDEX IF NOT EXISTS "VadeAssignment_tenantId_idx" ON "VadeAssignment"("tenantId");
CREATE INDEX IF NOT EXISTS "VadeSyncLog_tenantId_idx" ON "VadeSyncLog"("tenantId");
CREATE INDEX IF NOT EXISTS "EInvoiceDocument_tenantId_idx" ON "EInvoiceDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "Category_tenantId_idx" ON "Category"("tenantId");
CREATE INDEX IF NOT EXISTS "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductComplementAuto_tenantId_idx" ON "ProductComplementAuto"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductComplementManual_tenantId_idx" ON "ProductComplementManual"("tenantId");
CREATE INDEX IF NOT EXISTS "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierPriceListUpload_tenantId_idx" ON "SupplierPriceListUpload"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierPriceListFile_tenantId_idx" ON "SupplierPriceListFile"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierPriceListItem_tenantId_idx" ON "SupplierPriceListItem"("tenantId");
CREATE INDEX IF NOT EXISTS "SupplierPriceListMatch_tenantId_idx" ON "SupplierPriceListMatch"("tenantId");
CREATE INDEX IF NOT EXISTS "CategoryPriceRule_tenantId_idx" ON "CategoryPriceRule"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductPriceOverride_tenantId_idx" ON "ProductPriceOverride"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerPriceListRule_tenantId_idx" ON "CustomerPriceListRule"("tenantId");
CREATE INDEX IF NOT EXISTS "Cart_tenantId_idx" ON "Cart"("tenantId");
CREATE INDEX IF NOT EXISTS "CartItem_tenantId_idx" ON "CartItem"("tenantId");
CREATE INDEX IF NOT EXISTS "Order_tenantId_idx" ON "Order"("tenantId");
CREATE INDEX IF NOT EXISTS "OrderItem_tenantId_idx" ON "OrderItem"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerPriceAgreement_tenantId_idx" ON "CustomerPriceAgreement"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerRequest_tenantId_idx" ON "CustomerRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerRequestItem_tenantId_idx" ON "CustomerRequestItem"("tenantId");
CREATE INDEX IF NOT EXISTS "Quote_tenantId_idx" ON "Quote"("tenantId");
CREATE INDEX IF NOT EXISTS "QuoteItem_tenantId_idx" ON "QuoteItem"("tenantId");
CREATE INDEX IF NOT EXISTS "QuoteHistory_tenantId_idx" ON "QuoteHistory"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerContact_tenantId_idx" ON "CustomerContact"("tenantId");
CREATE INDEX IF NOT EXISTS "SyncLog_tenantId_idx" ON "SyncLog"("tenantId");
CREATE INDEX IF NOT EXISTS "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX IF NOT EXISTS "OrderTrackingSettings_tenantId_idx" ON "OrderTrackingSettings"("tenantId");
CREATE INDEX IF NOT EXISTS "PendingMikroOrder_tenantId_idx" ON "PendingMikroOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "suppliertransmissionlog_tenantid_idx" ON "suppliertransmissionlog"("tenantid");
CREATE INDEX IF NOT EXISTS "ProductFamily_tenantId_idx" ON "ProductFamily"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductFamilyItem_tenantId_idx" ON "ProductFamilyItem"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseOrderWorkflow_tenantId_idx" ON "WarehouseOrderWorkflow"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseOrderWorkflowItem_tenantId_idx" ON "WarehouseOrderWorkflowItem"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseShelfLocation_tenantId_idx" ON "WarehouseShelfLocation"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseDispatchDriver_tenantId_idx" ON "WarehouseDispatchDriver"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseDispatchVehicle_tenantId_idx" ON "WarehouseDispatchVehicle"("tenantId");
CREATE INDEX IF NOT EXISTS "WarehouseImageIssueReport_tenantId_idx" ON "WarehouseImageIssueReport"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailLog_tenantId_idx" ON "EmailLog"("tenantId");
CREATE INDEX IF NOT EXISTS "ReportExclusion_tenantId_idx" ON "ReportExclusion"("tenantId");
CREATE INDEX IF NOT EXISTS "Task_tenantId_idx" ON "Task"("tenantId");
CREATE INDEX IF NOT EXISTS "TaskComment_tenantId_idx" ON "TaskComment"("tenantId");
CREATE INDEX IF NOT EXISTS "TaskAttachment_tenantId_idx" ON "TaskAttachment"("tenantId");
CREATE INDEX IF NOT EXISTS "TaskLink_tenantId_idx" ON "TaskLink"("tenantId");
CREATE INDEX IF NOT EXISTS "TaskStatusHistory_tenantId_idx" ON "TaskStatusHistory"("tenantId");
CREATE INDEX IF NOT EXISTS "TaskTemplate_tenantId_idx" ON "TaskTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");
