# Portable: runs on any Docker host (Fly.io, Render, Railway, a VPS...).
# Mount a persistent volume at /data — it holds licenses.db and its daily backups.
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY tsconfig.json ./
ENV NODE_ENV=production DATA_DIR=/data HOST=0.0.0.0 PORT=8787 TRUST_PROXY=true
VOLUME /data
EXPOSE 8787
USER node
CMD ["npx", "tsx", "src/index.ts"]
