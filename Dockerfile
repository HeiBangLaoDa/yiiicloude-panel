# yiiicloude-panel — Payload 3 + Next.js 16 standalone build
# Multi-stage: deps → builder → runner（最小化运行时镜像）
#
# 重点：
# - corepack 启用 pnpm（无需手装）
# - next build 产出 .next/standalone/server.js（含 minimal node_modules）
# - runner 仅 COPY standalone + static + public + src（动态 require 需要 src）
# - sharp 已在 deps（package.json），alpine 上需 libc6-compat 才能加载 native binding
# - 容器内端口 3001（与 dev 对齐，便于本地 / prod 一致排错）

FROM node:22.17.0-alpine AS base

# ────────────────────────────────────────────────────────────────────
# Stage 1: deps — 装所有 dependencies（含 dev，因 builder 要 pnpm build）
# ────────────────────────────────────────────────────────────────────
FROM base AS deps
# 显式 pin pnpm@10（panel package.json engines.pnpm 限 ^9 || ^10；
# `corepack enable pnpm` 不读 engines 字段，默认拉最新 11.x，会被 npm 拒绝）
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm i --frozen-lockfile

# ────────────────────────────────────────────────────────────────────
# Stage 2: builder — pnpm build → 产出 .next/standalone
# ────────────────────────────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build 时不需要真实 DB / secret（next build 仅产 admin UI 静态资源 + standalone server）
# 占位即可，runtime env 会覆盖
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URI=postgres://placeholder@placeholder/placeholder
ENV PAYLOAD_SECRET=placeholder-build-time-secret

RUN pnpm run build

# ────────────────────────────────────────────────────────────────────
# Stage 3: runner — 最小化运行时
# ────────────────────────────────────────────────────────────────────
FROM base AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ARG GIT_SHA=unknown
LABEL org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.source="https://github.com/HeiBangLaoDa/yiiicloude-panel"

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Payload 在 runtime 由 src/payload.config.ts 加载 collection；
# standalone 通常 trace 进 .next/standalone 里，但保险起见把 src 也带上
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
