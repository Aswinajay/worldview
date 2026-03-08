FROM node:20-alpine

WORKDIR /app

# Copy server
COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/

# Copy and build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Serve client from server
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Add static file serving for client build
CMD ["node", "server/src/index.js"]
