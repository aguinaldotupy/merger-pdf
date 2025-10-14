#!/bin/sh
set -e

echo "🚀 Starting PDF Merger API..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until bun run prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready"

# Run database migrations
echo "📦 Running database migrations..."
bun run prisma:deploy

# Start the application
echo "✅ Migrations complete. Starting server..."
exec bun run serve
