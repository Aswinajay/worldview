FROM node:20-alpine

WORKDIR /app

# Install native tools required to compile better-sqlite3 on Alpine
RUN apk add --no-cache python3 make g++ sqlite-dev

# 1. Build Client First
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# 2. Build Server
COPY server/package*.json ./server/
RUN cd server && npm ci

COPY server/ ./server/

# 3. Environment variables for production single-port serving
ENV NODE_ENV=production
ENV SERVE_CLIENT=true
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/src/index.js"]
