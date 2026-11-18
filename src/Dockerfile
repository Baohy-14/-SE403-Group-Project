# Multi-role lightweight Node.js 22 LTS Alpine image (built-in node:sqlite, node:crypto, node:net)
FROM node:22-alpine

WORKDIR /app

# Copy zero-dependency MediLink Platform source code
COPY package.json ./
COPY core ./core
COPY worker ./worker
COPY mock-his ./mock-his
COPY tests ./tests

# Create persistent storage mountpoints for SQLite WAL DB & Encrypted Lab Object Bucket
RUN mkdir -p /data/db /data/lab-files

EXPOSE 3000

CMD ["node", "--no-warnings", "core/server.js"]
