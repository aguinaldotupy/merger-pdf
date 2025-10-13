-- CreateTable
CREATE TABLE "download_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "responseTime" INTEGER,
    "errorMessage" TEXT
);

-- CreateIndex
CREATE INDEX "download_events_statusCode_idx" ON "download_events"("statusCode");

-- CreateIndex
CREATE INDEX "download_events_url_idx" ON "download_events"("url");

-- CreateIndex
CREATE INDEX "download_events_statusCode_timestamp_idx" ON "download_events"("statusCode", "timestamp");

-- CreateIndex
CREATE INDEX "download_events_timestamp_idx" ON "download_events"("timestamp");
