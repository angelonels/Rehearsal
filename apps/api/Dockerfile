FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rehearsal/api build

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/server.js"]
