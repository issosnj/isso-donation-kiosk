FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Keep ts-node and tsconfig-paths for running migrations
# Don't prune these specific packages
RUN npm install --save ts-node tsconfig-paths

# Expose port
EXPOSE 3000

# Create startup script that runs migrations then starts the app
RUN echo '#!/bin/sh\n\
set -e\n\
echo "Running database migrations..."\n\
node -r ts-node/register -r tsconfig-paths/register dist/scripts/run-migrations.js || echo "Migration failed or already run, continuing..."\n\
echo "Starting application..."\n\
exec npm run start:prod\n\
' > /app/start.sh && chmod +x /app/start.sh

# Start the application (migrations run automatically)
CMD ["/app/start.sh"]

