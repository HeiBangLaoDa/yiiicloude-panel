# CLAUDE.md — yiiicloude-panel

> 层级约定：本文 = 项目身份 + 业务红线；命令 → `README.md`；协作纪律 → `../CLAUDE.md`；历史 → `../memory/`（含 `project_payload_panel_inflight.md`）；工程原则 → `~/.claude/CLAUDE.md`。

## 项目身份

YiiicloudeGroup 新业务 SoT —— Payload 维护租户 / 订阅 / IM 凭证 / 路由规则 / 用量记录 / 审计日志。管理后台（`/admin/*` Payload 自带）+ 客户面（`(customer)/*` Next.js + AntD 自写）同一 app。技术栈：pnpm + Next.js 16 + Payload 3.84.1 + AntD 6 + Postgres。

## 协作模式（特例）

- ✅ **group 总管可直接 Edit / Write panel 代码**（不派 subagent）
- ✅ 改完仍要 Hermes auditor 审
- ❌ 不要把 collection schema 改派给 subagent（涉及 Payload + Next.js 双端联调）

## 业务红线（不可破坏）

1. **Multi-tenant access control 每 collection 必须**：admin 全开 / customer 限 `{tenant: {equals: tid}}`；用 `isAdmin` + `getUserTenantId` helper（同时处理 `number | populated dict` 两种 relationship 形态）
2. **Fernet 明文字段不入库**：ImBindings 的 `app_secret_plain` / `aes_key_plain` 是 virtual，`beforeChange` hook 加密到 `_enc` 落盘；读取**永不解密**，仅返 `has_*` 布尔
3. **service-account API key 同步**：每跑 `pnpm tsx scripts/seed_customer_demo.ts` 会**重置** `service-control-plane@yiiicloude.internal` 的 key 并打印 stdout；必须同步到 `../yiiicloude-control-plane/.env` 的 `PAYLOAD_API_KEY=`，否则 cp 所有 router 401
4. **改 useAPIKey 等 auth 配置后必须重启 `pnpm dev`**：Next.js hot reload 不触发 Payload schema migration，新字段不会同步
5. **AntD 6 不能在 React Server Component 直接用**：每个 AntD page 拆 `page.tsx`（server，拉数据 → plain JSON）+ `*View.tsx`（`'use client'`，渲染 UI）
6. **Audit hook factory 用 `auditAfterChange` / `auditAfterDelete`**：actor 从 `req.user.email` 取；tenant 从 `doc.tenant` 取（除非 collection slug = `tenants` 时取 `doc.id`）

Postgres：库 `yiiicloude_panel`（**不是** `yiiicloude` 旧库 = 只读冻结），端口 54324（与 control-plane 共享 PG container）。
