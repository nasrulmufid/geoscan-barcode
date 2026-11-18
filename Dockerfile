# syntax=docker/dockerfile:1

# ---- Build frontend ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- Runtime ----
FROM node:24-alpine
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY package.json ./

# Database SQLite disimpan di /app/data (mount sebagai volume)
RUN mkdir -p data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/api/scans >/dev/null || exit 1
CMD ["node", "server/index.js"]
