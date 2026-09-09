-- Idempotent client event ids for analytics ingest (retry / double-post safe).
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "clientEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_clientEventId_key" ON "AnalyticsEvent"("clientEventId");
