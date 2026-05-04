ALTER TABLE "product_price_stats"
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "first_change_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "days_since_last_change" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "avg_change_frequency_days" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "current_stock" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "product_price_stats_brand_idx" ON "product_price_stats"("brand");
CREATE INDEX IF NOT EXISTS "product_price_stats_days_since_last_change_idx" ON "product_price_stats"("days_since_last_change" DESC);
CREATE INDEX IF NOT EXISTS "product_price_stats_total_changes_idx" ON "product_price_stats"("total_changes" DESC);
