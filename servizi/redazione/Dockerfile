# Il portale della redazione sul nostro server: la stessa app Next.js, costruita qui.
# Si costruisce dalla radice del repository (vedi docker-compose.yml).
FROM node:22-alpine AS costruzione
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 TZ=Europe/Rome
COPY --from=costruzione /app/.next/standalone ./
COPY --from=costruzione /app/.next/static ./.next/static
COPY --from=costruzione /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/redazione >/dev/null || exit 1
CMD ["node", "server.js"]
