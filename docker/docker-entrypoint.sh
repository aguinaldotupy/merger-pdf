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

# Run database migrations
echo "📦 Running database migrations..."
bun run prisma:deploy

# Start the application
echo "✅ Migrations complete. Starting server..."
exec bun run serve
