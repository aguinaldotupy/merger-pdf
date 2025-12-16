-- CreateTable
CREATE TABLE "pdf_processing_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "processingTime" INTEGER,
    "errorMessage" TEXT,
    "errorType" TEXT
);

-- CreateIndex
CREATE INDEX "pdf_processing_events_success_idx" ON "pdf_processing_events"("success");

-- CreateIndex
CREATE INDEX "pdf_processing_events_url_idx" ON "pdf_processing_events"("url");

-- CreateIndex
CREATE INDEX "pdf_processing_events_success_timestamp_idx" ON "pdf_processing_events"("success", "timestamp");

-- CreateIndex
CREATE INDEX "pdf_processing_events_timestamp_idx" ON "pdf_processing_events"("timestamp");
