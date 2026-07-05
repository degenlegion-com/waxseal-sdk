FROM node:20-alpine AS builder
  WORKDIR /app
  COPY mcp/package.json ./
  RUN npm install
  COPY mcp/ ./
  RUN npm run build

  FROM node:20-alpine
  WORKDIR /app
  COPY --from=builder /app/dist ./dist
  ENTRYPOINT ["node", "dist/index.js"]
  