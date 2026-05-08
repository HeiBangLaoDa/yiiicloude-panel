# TASK-PN-P3-A: panel tenant-role-kb collection 报告

## VERDICT: PASS

## 1. 关键产出（路径 + 行数）

- `/Users/charleslee/Desktop/YiiicloudeGroup/yiiicloude-panel/src/collections/TenantRoleKB.ts` — 新建，113 行
- `/Users/charleslee/Desktop/YiiicloudeGroup/yiiicloude-panel/src/payload.config.ts` — 改，+2 行（import + collections 数组）
- `/Users/charleslee/Desktop/YiiicloudeGroup/yiiicloude-panel/src/payload-types.ts` — 自动重生（pnpm generate:types），新增 `TenantRoleKb` / `TenantRoleKbSelect` 接口

## 2. 决策树 8 项自评（命令 + 输出）

1. **TenantRoleKB.ts 存在 + 正确 export** — `head -20 src/collections/TenantRoleKB.ts` 命中 `export const TenantRoleKB: CollectionConfig` ✅

2. **payload.config.ts 已注册** — `grep "TenantRoleKB" src/payload.config.ts` 命中 import 行 + collections 数组行（共 2 行）✅

3. **含 7 个核心字段** — `grep "name: '" src/collections/TenantRoleKB.ts | wc -l` = 9（含 array 子字段 `field` / `rule`，核心 7 个都在）✅

4. **role select 含 ≥4 角色** — `grep -E "value: '(boss|hr_manager|it_admin|boss_assistant|default)'" | wc -l` = 5（全 5 角色）✅

5. **tenant 是 relationship → tenants** — `grep -A3 "name: 'tenant'" | grep "relationTo"` 命中 `relationTo: 'tenants'` ✅

6. **access control 用 isAdmin + getUserTenantId** — `grep -E "isAdmin|getUserTenantId"` 命中 6 行（import + read/create/update/delete）✅

7. **pnpm generate:types 跑通 0 错误** — 输出 `Types written to ...payload-types.ts`，退出码 0 ✅

8. **TypeScript 编译 0 错误** — `pnpm typecheck`（即 `tsc --noEmit`）无任何输出，退出码 0 ✅

## 3. 关键设计决策

- **access control 实际 export 名**：`getUserTenantId` + `isAdmin`（与 Tenants/Subscriptions 完全一致，直接复用）
- **audit hook 启用**：`hooks/audit.ts` 存在且 export `auditAfterChange` 工厂函数（接受 `{ summarize }` 参数）。TenantRoleKB 已接入，summarize 返回 `SOUL 模板创建/更新：${module} / ${role}`
- **payload-types.ts 重生后变化**：`grep -i "TenantRole" src/payload-types.ts | wc -l` = 8 行（包括 `TenantRoleKb` 接口、`TenantRoleKbSelect` 接口、`AllAuthenticatedOrPublicCollections` 联合类型中的 `'tenant-role-kb'` 等）
- **字段风格对齐**：下划线命名（`soul_template` / `visible_fields` / `red_lines` / `is_active`），`type: 'text'`（非 `'string'`），与现有 collection 完全一致
- **admin group**：`'Hermes 配置'`（独立分组，与 `'业务数据'` 区隔）

## 4. 给 group 的下一步建议

- 派 `AUDIT-27-PN-P3-A`，让 Hermes auditor 验：文件存在 + 注册 + 字段数 + typecheck 通过
- **control-plane provision worker 拉数据建议 query**：
  ```
  GET /api/tenant-role-kb?where[tenant.tenant_id][equals]=<tid>&where[module][equals]=<mod>&where[is_active][equals]=true&depth=0
  ```
  - `depth=0` 避免 populate tenant 对象（worker 只需要 KB 字段）
  - 按 `role` 字段分 5 条记录，对应 boss/hr_manager/it_admin/boss_assistant/default
  - 建议 worker 端做 `dict(records, key=lambda r: r['role'])` 映射，按 peer 识别的角色取对应模板渲染
- 无阻塞：`isAdmin`/`getUserTenantId` helper 名与预期一致，`auditAfterChange` hook 存在，无需任何改动
- 下一步可录入各 module 的默认 KB 数据（建议在 Admin UI 手动录，或写 seed 脚本）
