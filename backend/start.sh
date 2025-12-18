#!/bin/sh
set -e
echo "Running database migrations..."
node -r ts-node/register -r tsconfig-paths/register dist/scripts/run-migrations.js || echo "Migration failed or already run, continuing..."
echo "Starting application..."
exec npm run start:prod

