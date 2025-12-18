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

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Start the application (migrations run automatically)
CMD ["/app/start.sh"]

