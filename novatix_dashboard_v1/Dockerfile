FROM node:22-alpine AS webbuild
WORKDIR /build
COPY web/package*.json ./
RUN npm install --no-audit --no-fund
COPY web/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server/server.js ./server.js
COPY --from=webbuild /build/dist ./public
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
 CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>{if(!r.ok)process.exitCode=1}).catch(()=>{process.exitCode=1})"
CMD ["node", "server.js"]
