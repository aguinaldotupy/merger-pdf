#!/bin/sh
set -e

echo "🚀 Starting PDF Merger API..."

echo "🔧 Configuring database... ${DATABASE_PROVIDER}"

# Wait for database to be ready (only for external databases)
if [ "$DATABASE_PROVIDER" = "postgresql" ] || [ "$DATABASE_PROVIDER" = "mysql" ]; then
  echo "⏳ Waiting for $DATABASE_PROVIDER database to be ready..."
  until echo "SELECT 1" | bun run prisma db execute --stdin > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
  echo "✅ Database is ready"
else
  echo "📁 Using SQLite (local file database)"
fi

# Apply database schema (works for all providers without provider-specific migrations)
echo "📦 Applying database schema..."
bun run prisma db push --skip-generate

# Start the application
echo "✅ Schema applied. Starting server..."
exec bun dist/index.js
