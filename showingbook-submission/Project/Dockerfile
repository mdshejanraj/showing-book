# Build context is the repository root (see docker-compose.yml).
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY Project/package.json Project/package-lock.json ./Project/
RUN cd Project && npm ci --omit=dev

COPY Project ./Project
COPY database ./database

# Persistent data lives in a volume, owned by the unprivileged "node" user.
RUN mkdir -p /data && chown -R node:node /data /app
ENV DATABASE_PATH=/data/showingbook.db PORT=3000
VOLUME ["/data"]
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "Project/server/src/index.js"]
