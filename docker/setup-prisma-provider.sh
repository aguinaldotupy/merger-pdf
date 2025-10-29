#!/bin/sh
set -e

# Script to update Prisma datasource provider (NOT generator!) based on DB_PROVIDER
# Usage: DB_PROVIDER=postgresql ./setup-prisma-provider.sh

PROVIDER=${DB_PROVIDER:-sqlite}
SCHEMA_FILE="prisma/schema.prisma"

echo "🔧 Setting up Prisma schema for datasource provider: $PROVIDER"

# Validate provider
case "$PROVIDER" in
  sqlite|postgresql|mysql)
    echo "✅ Valid provider: $PROVIDER"
    ;;
  *)
    echo "❌ Invalid provider: $PROVIDER. Must be one of: sqlite, postgresql, mysql"
    exit 1
    ;;
esac

# Update the provider in schema.prisma ONLY in the datasource db block
if [ -f "$SCHEMA_FILE" ]; then
  echo "📝 Updating $SCHEMA_FILE datasource provider..."

  # Create a temporary awk script to update ONLY the datasource provider
  awk -v provider="$PROVIDER" '
    /^datasource db \{/ { in_datasource=1 }
    in_datasource && /provider = / {
      print "  provider = \"" provider "\""
      next
    }
    /^\}/ && in_datasource { in_datasource=0 }
    { print }
  ' "$SCHEMA_FILE" > "$SCHEMA_FILE.tmp"

  mv "$SCHEMA_FILE.tmp" "$SCHEMA_FILE"

  echo "✅ Datasource provider updated to: $PROVIDER"

  # Show both sections for verification
  echo "📄 Current schema configuration:"
  echo ""
  echo "Generator (should always be prisma-client-js):"
  grep -A 2 "generator client" "$SCHEMA_FILE" || echo "  (not found)"
  echo ""
  echo "Datasource (provider changed to: $PROVIDER):"
  grep -A 3 "datasource db" "$SCHEMA_FILE" || echo "  (not found)"
else
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi
