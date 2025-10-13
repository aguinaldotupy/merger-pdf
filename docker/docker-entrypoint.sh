#!/bin/sh
set -e

echo "🚀 Starting PDF Merger API..."

# Run database migrations
echo "📦 Running database migrations..."
bun run prisma:deploy

# Start the application
echo "✅ Migrations complete. Starting server..."
exec bun run serve
