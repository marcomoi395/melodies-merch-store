FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

FROM base AS prod-deps
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci --omit=dev --ignore-scripts --no-audit

FROM base AS build
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci
COPY . .

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

EXPOSE 3000

CMD [ "sh", "-c", "node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && node dist/database/seed.js && node dist/main.js" ]
