# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

本仓库另遵循用户全局 `~/.claude/CLAUDE.md` 的 Karpathy 四原则。
父目录 `../CLAUDE.md` 描述总管视角；本仓库背景 + Phase 进度见 `../project_payload_panel_inflight.md` memory。

## 协作模式（必读，2026-05-07 起生效）

本仓库与 yguard / reports / control-plane 不同：**panel 是 group 总管直接维护**的项目（不通过 subagent 派单）。group 在自己窗口里直接 Edit / Write panel 代码。

集团协作协议见 [`../PARALLEL_DEV_PATTERN.md`](../PARALLEL_DEV_PATTERN.md)。其中本项目特例：
- ✅ group 总管可以直接改 panel 代码（不派 subagent）
- ✅ 改完仍需 Hermes auditor 审（按协议 §4「总管自落地的也要审」）
- ❌ 不应把 panel 的 collection schema 改动派给 subagent（panel 改动通常涉及 Payload + Next.js 双端联调，subagent 只看片段容易出错）

> **2026-05-06 立项 + 完工**：YiiicloudeGroup 集团下的「管理面板 + 客户自助面」，与 yguard-agent / control-plane / reports 平级独立项目。**Phase 1 已交付 + 通过 Hermes AUDIT-18 独立验证**（PASS 8/8）。
> 立项原因：替代 Appsmith CE 运营面板（已归档为 `../yiiicloude-ops-panel.archived/`），并把租户/订阅/IM 凭证的 SoT 从 control-plane 旧库（`yiiicloude`）切到 Payload 新库（`yiiicloude_panel`）。
> 完整迁移计划见 `../plan/2026-05-06_payload_panel_migration.md`。

---

## 项目身份

- **新业务 SoT**：所有租户 / 订阅 / IM 凭证 / 路由规则 / 用量记录 / 审计日志归 Payload 维护
- **管理后台 + 客户面同一 app**：`/admin/*` 给运营（Payload 自带）、`(customer)/*` 给客户（Next.js + AntD 自写）
- **MCP-enabled**：`@payloadcms/plugin-mcp` 暴露 6 collection 给 Claude / Cursor 自然语言操作
- **被 control-plane 调用**：control-plane FastAPI（:8070）改 thin proxy 后，所有内部读写 → 本项目 REST API

---

## 常用命令

技术栈：**pnpm**（pnpm 9/10）+ Next.js 16 + Payload 3.84.1 + AntD 6 + recharts + Postgres。

```bash
# Dev server（端口固定 3001）
pnpm dev                                # 跑 next dev -p 3001

# 类型检查
pnpm typecheck                          # tsc --noEmit

# Payload 类型生成（改 collection 后必跑）
pnpm generate:types                     # 重写 src/payload-types.ts

# 数据库 seed（演示账号 + 业务数据 + control-plane service-account API key）
pnpm tsx scripts/seed_customer_demo.ts  # 输出 demo 账号 + 新 PAYLOAD_API_KEY

# Lint
pnpm lint
```

> **改 collection 的 auth 配置（如 useAPIKey）后必须重启 `pnpm dev`**——Next.js hot reload 不会触发 Payload schema migration，新字段不会同步到 Postgres。
> （已踩过：useAPIKey 加上后不重启，API key 验证全部 401）

---

## 端口 / 数据库

| 资源 | 值 |
|---|---|
| Dev server | http://127.0.0.1:3001 |
| Admin 入口 | http://127.0.0.1:3001/admin |
| 客户面登录 | http://127.0.0.1:3001/login |
| Payload REST | http://127.0.0.1:3001/api/{collection} |
| MCP 入口 | http://127.0.0.1:3001/api/mcp（Bearer key 必填） |
| Postgres 实例 | 54324（与 control-plane 共用 docker container `yiiicloude-control-plane-pg`） |
| Database name | `yiiicloude_panel`（**不是** `yiiicloude`，那是 control-plane 旧库 = 只读冻结） |

`.env` 关键变量：
```
DATABASE_URI=postgres://yiiicloude:yiiicloude@127.0.0.1:54324/yiiicloude_panel
PAYLOAD_SECRET=<32 字节 hex>
SECRET_FERNET_KEY=K3980oiqLIa3OWa6qLpj3QGIRcMoDRr5ejuxHRbXUDo=  ← 与 control-plane 同
```

---

## 高层架构

```
src/
├── payload.config.ts              ← collection 注册 + i18n(zh) + mcpPlugin
├── collections/
│   ├── Users.ts                   ← role(admin/customer) + tenant + useAPIKey
│   ├── Tenants.ts                 ← 客户主体（business tenant_id 字符串 + Payload 自增 id）
│   ├── Subscriptions.ts           ← 模块订阅（unique tenant+module_id）
│   ├── ImBindings.ts              ← IM 凭证（含 Fernet 加密 hook）
│   ├── RoutingRules.ts
│   ├── UsageRecords.ts
│   ├── AuditLog.ts                ← 含 tenant 字段；客户能读自己 tenant 的
│   └── Media.ts
├── hooks/
│   └── audit.ts                   ← 复用 hook factory：auditAfterChange / auditAfterDelete
├── lib/
│   ├── access.ts                  ← isAdmin / getUserTenantId 判定 helper
│   ├── fernet.ts                  ← encryptFernet（与 control-plane 同密钥兼容）
│   └── server-auth.ts             ← getCurrentUser（基于 cookie 解 payload.auth）
├── app/
│   ├── (frontend)/                ← 默认欢迎页（暂未清理）
│   ├── (payload)/admin/...        ← Payload 自带 admin（自动生成）
│   └── (customer)/                ← 客户面
│       ├── layout.tsx             ← root html/body + AntdRegistry
│       ├── providers.tsx          ← AntD ConfigProvider zh_CN + 主题
│       ├── login/page.tsx
│       └── (authed)/              ← 已登录受保护组
│           ├── layout.tsx         ← 校验登录 + AppShell
│           ├── AppShell.tsx       ← Sider + Header + 用户菜单
│           ├── dashboard/{page,DashboardView}.tsx
│           ├── subscriptions/{page,SubscriptionsView}.tsx
│           ├── im-config/{page,ImConfigView}.tsx
│           └── activity/{page,ActivityView}.tsx
└── scripts/
    ├── backfill_from_control_plane.ts  ← Phase C 一次性数据搬迁
    ├── seed_customer_demo.ts           ← demo + service-account API key 重置
    └── verify_fernet.ts                ← 加密互通自测
```

---

## 关键不变量

### 1. Multi-tenant 访问控制（每个 collection 必须）

```typescript
access: {
  read: ({ req: { user } }) => {
    if (!user) return false
    if (isAdmin(user)) return true
    const tid = getUserTenantId(user)
    return tid ? { tenant: { equals: tid } } : false
  },
  // create/update/delete 同模式或限制为 isAdmin 才允许
}
```

`isAdmin` 把 MCP API key 也视同 admin（`payload-mcp-api-keys` collection）；`getUserTenantId` 同时处理 number 与 populated object。

### 2. Fernet 加密策略（ImBindings）

明文输入字段 `app_secret_plain` / `aes_key_plain` 是 **virtual** 字段（不入库），`beforeChange` hook 把它们加密到 `app_secret_enc` / `aes_key_enc` 后落盘。读取时**永不解密回返**——仅返回 `has_app_secret` / `has_aes_key` 布尔。

### 3. control-plane 调 Payload 用 service-account API key

每次跑 `pnpm tsx scripts/seed_customer_demo.ts` 会**重置** `service-control-plane@yiiicloude.internal` 的 API key 并打印到 stdout。重置后必须把新 key 写到 `../yiiicloude-control-plane/.env` 的 `PAYLOAD_API_KEY=`。

### 4. Audit hook factory（新加 collection 一行接入）

```typescript
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

hooks: {
  afterChange: [auditAfterChange({ summarize: (doc, op, prev) => '...' })],
  afterDelete: [auditAfterDelete({ summarize: (doc) => '...' })],
}
```

actor 自动从 `req.user.email` 取（service-account / customer 自动区分）；tenant 自动从 `doc.tenant` 取（除非 collection slug = `tenants` 时取 `doc.id`）。

---

## 已知坑（已踩 + 已修，再踩省一份调试时间）

1. **AntD 6 不能在 React Server Component 直接用** —— 报 `Element type is invalid: ... got: undefined`。每个用 AntD 的 page 都要拆成两个文件：
   - `page.tsx`（server component）—— 拉数据，传 plain JSON 给 view
   - `*View.tsx`（`'use client'`）—— 接收 props 渲染 AntD UI
   - 实例：`(authed)/dashboard/{page.tsx, DashboardView.tsx}` 模式

2. **Next.js 16 默认拒跨 origin dev resources** —— admin 显示空白。`next.config.ts` 加 `allowedDevOrigins: ['127.0.0.1','localhost','0.0.0.0','192.168.3.106']`

3. **`fernet` npm 包没 TypeScript types** —— 手写 `src/types/fernet.d.ts`

4. **MCP plugin 装上后 `req.user` 类型变 `User | PayloadMcpApiKey`** —— `lib/access.ts` 的 helper 已加 `isMcpApiKey()` 兼容（视同 admin）

5. **Payload `relationship` 字段类型是 `number | RelatedDoc` 联合** —— 读 tenant id 必须用 `getUserTenantId` 同时处理两种形态，不要直接 `user.tenant.id`

6. **改 `useAPIKey` 等 auth 配置后必须重启 dev** —— hot reload 不触发 schema migration

7. **`payload.find` 不接 `headers` 参数** —— 服务端调用要传 `user` + `overrideAccess: false` 才走 access control；不传则默认 admin 视角看全量

8. **CDP 后台 tab 不渲染（Chrome 节流）** —— 截图全黑，不是 Payload 问题；前台聚焦后正常

---

## 文档约定

- 跨项目 plan / 阶段计划 → 父目录 `../plan/`（不是本仓库）
- 进度文档 → 待立 `progress/` 目录（本项目目前没设，按需新建）
- 持久记忆见父目录 memory（`../project_payload_panel_inflight.md` 是当前项目状态主索引）

---

## demo 账号（重跑 seed 自动重建）

```
http://127.0.0.1:3001/login
A: customer-a@yiiicloude.test / demo123456   (tenant Alpha, 85% 配额警示)
B: customer-b@yiiicloude.test / demo123456   (tenant Beta,  105% 配额超额)
control-plane service: service-control-plane@yiiicloude.internal (admin + 重新生成的 apiKey)
```

每次跑 `pnpm tsx scripts/seed_customer_demo.ts`：
- demo 账号密码不变（已存在则更新 tenant 关联和 display_name）
- API key **重置**（control-plane .env 必须同步更新）
- usage-records 当前租户旧数据**先删后建**（避免重复跑膨胀）；其他 collection 走 upsert
