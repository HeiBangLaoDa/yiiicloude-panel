# TASK-SN-51b — Admin 开通向导 + 一键 Provision

日期：2026-05-10
状态：✅ 完成（pnpm typecheck PASS）

---

## 1. ipguard→yguard 修复

文件：`src/app/(customer)/(authed)/subscriptions/SubscriptionsView.tsx`
行号：11（`moduleLabels` 第一个 key）
修改：`ipguard` → `yguard`

---

## 2. Payload customViews 注册（payload.config.ts diff）

```ts
admin: {
  user: Users.slug,
  importMap: { baseDir: path.resolve(dirname) },
  components: {
    views: {
      Onboard: {
        Component: '@/components/admin/OnboardView#OnboardView',
        path: '/onboard',
      },
    },
    beforeNavLinks: ['@/components/admin/OnboardNavLink#OnboardNavLink'],
  },
},
```

注意事项：
- Payload v3.84.1 的 `AdminViewConfig.Component` 类型为 `PayloadComponent`（`string | RawPayloadComponent`），字符串格式 `'path#ExportName'` 是支持的写法。
- `beforeNavLinks` 同理接受字符串数组。
- path 加 `@/` alias 需 tsconfig 已配（panel 项目已配 `@/` → `src/`）。

---

## 3. 新增组件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `src/components/admin/OnboardView.tsx` | Server component | Payload admin custom view 入口；校验 isAdmin；渲染 OnboardForm |
| `src/components/admin/OnboardForm.tsx` | `'use client'` | AntD Steps + Form 4 步 wizard；fetch POST `/api/admin-onboard`；成功/失败 Result 面板 |
| `src/components/admin/OnboardNavLink.tsx` | Server component | 侧边栏顶部"☆ 新客户开通"链接 |

---

## 4. Server Action `/api/admin-onboard/route.ts` 接口契约

### Input（POST body JSON）

```json
{
  "tenant": {
    "tenant_id": "acme_corp",
    "company_name": "Acme 科技有限公司",
    "industry": "tech",
    "plan": "standard",
    "boss_user_ids": "staffId1,staffId2",
    "monthly_quota": 50000
  },
  "modules": [
    { "module_id": "yguard", "plan": "standard", "quota_monthly": 5000 },
    { "module_id": "reports", "plan": "standard", "quota_monthly": 10000 }
  ],
  "im_binding": {
    "platform": "dingtalk",
    "client_id": "dingXXXX",
    "app_secret_plain": "secret",
    "agent_id": "12345",
    "aes_key_plain": ""
  },
  "tenant_role_kb": [
    { "role": "boss", "persona": "...", "visible_fields": "a / b", "red_lines": "r1; r2" },
    { "role": "employee", "persona": "...", "visible_fields": "...", "red_lines": "..." }
  ]
}
```

### Output（success）

```json
{
  "success": true,
  "tenant_id": "acme_corp",
  "tenant_pid": 5,
  "modules": ["yguard", "reports"],
  "skills_linked": ["yguard", "reports"],
  "started": true,
  "errors": []
}
```

### Output（failure）

```json
{
  "success": false,
  "stage": "im_binding_create",
  "tenant_id": "acme_corp",
  "tenant_pid": 5,
  "created_subscription_ids": [12, 13],
  "errors": ["已存在 unique 约束冲突"]
}
```

特殊错误码：
- `409 tenant_already_exists` — tenant_id 已存在
- `401 unauthorized` — 非 admin 访问
- `400 missing_required_fields` — 缺必填字段

---

## 5. 流程设计决策

- **provision 错误非致命**：Panel 数据已建完之后 provision 失败，仍返回 `success: true` 但 `errors` 数组带告警；admin 可手动 ssh prod 重跑 provision。
- **无事务回滚**：建到一半失败时，返回已建的 tenant_pid + subscription_ids，让 admin 去 /admin/collections/* 手工清理。这是 wizard 的设计意图——留痕给 admin 看。
- **KB visible_fields / red_lines**：字符串 `/` 分隔转 `{field: ...}` 数组；`;` 分隔转 `{rule: ...}` 数组（与 onboard_tenant.py 逻辑一致）。
- **`skipKB`**：Step 4 提供"跳过"选项，`tenant_role_kb` 不传即不建，admin 可事后在 collection UI 补建。

---

## 6. Payload v3 API 实际写法 vs 文档差异

文档示例有时用 object 写法 `{ Component: { path: '...', exportName: '...' } }`，但 v3.84.1 类型定义（`dist/config/types.d.ts`）的 `PayloadComponent = string | RawPayloadComponent | false`，字符串格式 `'@/path/to/file#ExportName'` 是合法写法，与 Payload 官方文档 import map 约定一致。

---

## 7. typecheck PASS 输出

```
> yiiicloude-panel@0.1.0 typecheck
> tsc --noEmit
（无 error 输出）
```

---

## 8. Manual 验证步骤

1. 启动 dev：`pnpm dev`
2. 访问 http://127.0.0.1:3001/admin，以 admin 账号登录
3. 左侧导航顶部应出现「☆ 新客户开通」链接
4. 点击进入 `/admin/onboard`，走 4 步表单：
   - Step 1：填 tenant_id（小写英数下划线）、company_name 等
   - Step 2：勾选 yguard / reports 至少一个
   - Step 3：填钉钉 client_id / secret / agent_id
   - Step 4：确认 KB 默认值或勾选"跳过"
5. 点"提交开通"→ 看成功/失败 Result 面板
6. 验证：
   - `GET /admin/collections/tenants` 新租户出现
   - `GET /admin/collections/subscriptions` 订阅行出现
   - `GET /admin/collections/im-bindings` IM 凭证行出现
   - `GET /admin/collections/tenant-role-kb` boss/employee 两行出现（如未 skip）
   - provision 成功则 ssh prod 看 hermes profile

---

## 9. 新增 env 变量

`.env` / `.env.example` 追加：
```
CONTROL_PLANE_BASE_URL=http://127.0.0.1:8070
CONTROL_PLANE_ADMIN_SECRET=<与 control-plane ADMIN_SECRET 同步>
```
