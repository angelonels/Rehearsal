FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/voice ./apps/voice
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rehearsal/voice build

FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
CMD ["node", "apps/voice/dist/agent.js", "start"]
