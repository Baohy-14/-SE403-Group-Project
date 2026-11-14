# Dockerfile for MediLink Platform
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose ports
EXPOSE 3000 8001 8002 8003

# Default entrypoint starts all mock servers and the core server
CMD ["node", "-e", "require('./mock-his/mockServersManager').startAll().then(() => require('./core/server')().listen(3000, () => console.log('MediLink Platform & Mock HIS Servers Ready on Port 3000, 8001, 8002, 8003')));"]
