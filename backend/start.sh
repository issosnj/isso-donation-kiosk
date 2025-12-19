#!/bin/sh
set -e
echo "Running database migrations..."
# Try to run migrations using TypeORM CLI directly
npm run migration:run || echo "Migration failed or already run, continuing..."
echo "Starting application..."
exec npm run start:prod

