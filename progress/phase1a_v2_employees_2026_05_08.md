# TASK-PN-P1A-V2: Employees collection + TenantRoleKB v2 改造

> 日期：2026-05-08 | 执行：group 总管自做（按 panel CLAUDE.md，panel 不派 subagent）
> plan：[`../plan/2026-05-08_v2_per-tenant-multi-module-agent.md`](../plan/2026-05-08_v2_per-tenant-multi-module-agent.md) §A1 + §A2 + D6

## VERDICT: PASS

## 1. 关键产出

| 文件 | 操作 | 摘要 |
|---|---|---|
| `src/collections/Employees.ts` | 新建 (~145 行) | 钉钉镜像 + role 业务字段；钉钉同步字段 admin readOnly；indexes [tenant, staff_id] unique |
| `src/collections/TenantRoleKB.ts` | 改 | 删 `module` 字段；role 选项加 employee + dept_head；indexes [tenant, role] unique；defaultColumns 去 module；audit summarize 去 module |
| `src/collections/Subscriptions.ts` | 改 | module_id 选项 `ipguard` → `yguard`（D6） + moduleLabels 对齐 |
| `src/payload.config.ts` | 改 | import + collections 数组注册 Employees |
| `src/payload-types.ts` | 自动重生 | 含 `Employee` + `EmployeesSelect` 接口 + TenantRoleKB 去 module 字段 |

## 2. 决策树 8 项自评

| # | 必查 | 结果 | 证据 |
|---|---|---|---|
| 1 | Employees.ts 文件存在 + slug 'employees' + export const | PASS | `head -10 src/collections/Employees.ts` 含 `export const Employees: CollectionConfig` |
| 2 | Employees fields 含 9 字段（tenant/staff_id/name/email/department/department_id/manager_staff_id/position/is_active/dingtalk_synced_at/role） | PASS | 共 11 个 name 字段（plan §A1 列 9 + position + email = 11） |
| 3 | 钉钉同步字段标 admin.readOnly: true | PASS | `grep -c "readOnly: true" src/collections/Employees.ts` ≥ 7（钉钉来源字段全 readOnly） |
| 4 | role 字段 6 选项含 employee + dept_head + boss + dept_head + boss_assistant + hr_manager + it_admin | PASS | `grep "value: '" src/collections/Employees.ts \| wc -l` = 6 |
| 5 | indexes unique [tenant, staff_id] | PASS | `grep -A2 "indexes:" src/collections/Employees.ts` 含 `unique: true` |
| 6 | TenantRoleKB 已删 module 字段 | PASS | `grep "name: 'module'" src/collections/TenantRoleKB.ts` 0 行 |
| 7 | TenantRoleKB role 加了 employee + dept_head | PASS | `grep -E "value: '(employee\|dept_head)'" src/collections/TenantRoleKB.ts` 2 命中 |
| 8 | Subscriptions module_id 改为 yguard | PASS | `grep "value: 'yguard'\|value: 'reports'" src/collections/Subscriptions.ts` 2 行；`grep "ipguard" src/collections/Subscriptions.ts` 0 行 |

## 3. 验证命令实测

```bash
$ pnpm generate:types
[19:09:23] INFO: Compiling TS types for Collections and Globals...
[19:09:23] INFO: Types written to .../payload-types.ts

$ pnpm tsc --noEmit
（0 错；exit 0）

$ grep -E "interface Employee\b|EmployeesSelect" src/payload-types.ts
    employees: EmployeesSelect<false> | EmployeesSelect<true>;
export interface Employee {
export interface EmployeesSelect<T extends boolean = true> {
```

## 4. 现有数据兼容性

- panel 当前 `subscriptions` 数据：1 条 (qinyin × reports active)，**未涉及 ipguard**，所以 Subscriptions value 改名零迁移。
- panel 当前 `tenant-role-kb` 数据：4 条 (qinyin × reports × {default,boss,boss_assistant,it_admin})，含旧 `module` 字段值 = "reports"。
  - schema 改后 collection 不再读 `module` 字段；DB 列保留（panel 自动 schema migration 通常不删列，仅加列）—— 数据可读但 admin UI 不显示
  - tenant + role unique 检查：4 条数据每个 role 仅 1 条，**不冲突**
- panel `employees` collection：新建，无现存数据。需要 P2A 钉钉通讯录 sync worker 完成后跑 `POST /v1/contacts/sync/qinyin` 首次填充

## 5. 不做的事（确认）

- ❌ 没改其他 collection（Tenants/ImBindings/RoutingRules/UsageRecords/AuditLog/Users/Media）
- ❌ 没碰 lib/access.ts / hooks/audit.ts（复用现有 helper）
- ❌ 没改 mcpPlugin 配置（待用户后续决定 MCP 开放 employees / tenant-role-kb 与否）
- ❌ panel dev server 未重启（schema 改动需重启让 db 同步 unique index；group 后续在 P2A 触发钉钉同步前重启即可）

## 6. AUDIT-29-PN-V2 必查清单（hermes auditor 用）

```
仅 Read + 只读 Bash（panel 非 git 仓库，git 命令 skip）

1. head -10 src/collections/Employees.ts
   期望：含 export const Employees: CollectionConfig + slug: 'employees'

2. grep -c "readOnly: true" src/collections/Employees.ts
   期望：≥ 7

3. grep "value: '" src/collections/Employees.ts | wc -l
   期望：6（6 个 role 选项）

4. grep -A2 "indexes:" src/collections/Employees.ts | head -5
   期望：含 fields: ['tenant', 'staff_id'] + unique: true

5. grep "name: 'module'" src/collections/TenantRoleKB.ts
   期望：0 命中（module 字段已删）

6. grep -E "value: '(employee|dept_head)'" src/collections/TenantRoleKB.ts | wc -l
   期望：2

7. grep -A2 "indexes:" src/collections/TenantRoleKB.ts | head -5
   期望：含 fields: ['tenant', 'role'] + unique: true

8. grep "ipguard" src/collections/Subscriptions.ts
   期望：0 命中（已改 yguard）

9. grep "TenantRoleKB\|Employees" src/payload.config.ts
   期望：≥ 4 命中（2 import + 2 collections 数组注册）

10. grep -E "interface Employee\b|EmployeesSelect" src/payload-types.ts | wc -l
    期望：≥ 3（接口 + Select 类型 + collections 字段）

11. cd /Users/charleslee/Desktop/YiiicloudeGroup/yiiicloude-panel && pnpm tsc --noEmit; echo $?
    期望：exit 0（0 错）

12. wc -l progress/phase1a_v2_employees_2026_05_08.md
    期望：≥ 50

13. grep -iE "sk-[a-zA-Z0-9]{20,}|api[_-]?key.*=.*['\"][a-zA-Z0-9]{20,}" src/collections/Employees.ts progress/phase1a_v2_employees_2026_05_08.md
    期望：0 命中（无凭证泄漏）
```

## 7. 给 group 的下一步建议

- 派 **AUDIT-29-PN-V2**（决策树清单见 §6）
- AUDIT-29 通过后可重启 panel dev 让 db unique index 生效（在 P2A 钉钉同步前重启即可，**当前不必**——hot reload 已使 collection schema 在 admin UI 生效）
- P2A 钉钉通讯录 sync worker（task #13）就绪后，触发 `POST /v1/contacts/sync/qinyin` 首次填 Employees 表
