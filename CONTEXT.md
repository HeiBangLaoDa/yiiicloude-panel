## § 1 使命

yiiicloude-panel 是集团**业务数据 SoT**——以 Payload CMS 维护所有租户主体、IM 凭证、员工身份镜像及路由规则，向下游业务方（control-plane、hermes-agent）提供单一权威数据源，绝不允许其他服务双写。

---

## § 2 领域术语表

| 术语 | 含义 + 真实示例值 |
|---|---|
| **端口** | prod `127.0.0.1:3001`（不对公网暴露）；dev `127.0.0.1:3010` |
| **PG 库** | `yiiicloude_panel`，端口 `54324`（与 control-plane 共享同一 PG container） |
| **admin UI** | `/admin`（Payload 自带，仅内部运营使用） |
| **REST API** | `/api/<collection-slug>`，例：`/api/tenants`、`/api/employees` |
| **tenant_id** | Tenants collection 的业务编号（小写英数+下划线，如 `qinyin`），与 panel.tenants.id（整数主键）不同 |
| **tenants.id** | Payload 自增整数主键，例：勤寅 `id=3` |
| **company_name** | 营业执照全称，例：`勤寅（上海）人力资源管理有限公司`；yguard EXE 桌面文件夹以此命名 |
| **boss_user_ids** | 逗号分隔的钉钉 userId 字符串，用于报表抬头与最高权限识别 |
| **im-bindings** | IM 凭证 collection（1 tenant × 1 channel 唯一），slug `im-bindings`，PG 表 `im_bindings` |
| **employees** | 员工身份镜像，slug `employees`，钉钉同步字段 readOnly，仅 `role` 字段 admin 可改 |
| **staff_id** | 员工 collection 中的钉钉 userId 原始值（非 LWCP 编码），在 tenant 内唯一；与 hermes ACL 判定匹配 |
| **role** | 员工业务角色，两元实际使用：`boss`（4 人硬名单）/ `employee`（其余全员）；代码层还定义 dept_head/boss_assistant/hr_manager/it_admin 但当前勤寅租户不启用 |
| **im-bindings.channel** | `dingtalk` / `wecom` / `feishu` 三选一 |
| **app_secret_plain** | 虚字段（virtual），提交后被 beforeChange hook Fernet 加密写入 `app_secret_enc`，不入库 |
| **Payload collection slug** | 路由层标识，Payload 自动转 snake_case 为 PG 表名，例：`im-bindings` → `im_bindings` |
| **service-account API key** | `seed_customer_demo.ts` 运行后重置并打印的 cp 调用凭证，须同步到 `yiiicloude-control-plane/.env PAYLOAD_API_KEY=` |

---

## § 3 关键 invariant

1. **SoT 不双写**：钉钉/客户已有系统是上游事实，panel 仅镜像 + 维护业务语义字段（`role`）。禁止外部服务直接写 panel 的同步字段。→ ADR-0001；memory `feedback_existing_system_as_sot`

2. **panel 仅 127.0.0.1 暴露**：prod 不绑 0.0.0.0，业务方必须经 cp thin proxy（`cp:8070 → panel:3001/api`）访问。→ ADR-0003；memory `constraint_yiiicloude_api_no_public_exposure`

3. **ACL 两元：boss / employee**：勤寅租户 role 只有这两档；不存在部门维度权限；department 字段仅人事档案不进 ACL 判定。→ ADR 见 `docs/adr/`；memory `feedback_qinyin_two_tier_acl_only_boss_employee`

4. **4 boss 硬名单 + sync 强制覆盖**：李鹏 / 任紫俊 / 李溢挺 / 张翔宇 4 人 staff_id 固定为 boss；钉钉无的员工硬删；sync 强制覆盖 admin 手设 role，任何手动改 role 在下次 sync 后会被覆盖。→ memory `feedback_qinyin_4_boss_acl_2026_05_10`

5. **group 自改也需 L2 审计**：panel 代码由总管直接 Edit，但改完必须派 Hermes auditor 审；不自评通过。→ ADR-0004；CLAUDE.md §协作模式

---

## § 4 数据流入/出

```
钉钉 OpenAPI sync
  └─→ cp POST /v1/contacts/sync/{tenant_id}
        └─→ panel /api/employees  (create / update / delete)
              └─→ PG yiiicloude_panel:54324

业务查询
  └─→ hermes-agent / yguard-agent
        └─→ cp:8070 (thin proxy)
              └─→ panel:3001/api/<collection>
                    └─→ PG yiiicloude_panel:54324

运营操作
  └─→ admin UI /admin  →  panel  →  PG
```

钉钉组织架构同步产出：7 部门 / 31 员工，落地到 `employees` collection；tenant 勤寅 `id=3`，`im-bindings id=1`（dingtalk channel）。

---

## § 5 不要混淆

- `tenant_id`（`tenants.tenant_id` 文本业务编号，如 `qinyin`）vs `tenants.id`（Payload 自增整数主键，如 `3`）
- `employees.staff_id`（钉钉原始 userId 明文字符串）vs `tenants.boss_user_ids`（逗号分隔多人钉钉 userId）
- collection slug（路由层，如 `im-bindings`）vs Postgres 表名（Payload 自动生成，如 `im_bindings`）
- admin UI 手设 `role` vs sync 强制写 `role`（下次 sync 会覆盖手改，4 boss 硬名单在 sync worker 里维护）
- `app_secret_plain`（virtual 虚字段，不入库）vs `app_secret_enc`（Fernet 密文，实际落盘）
- prod 启动端口 `3001`（`pnpm start`）vs dev 端口 `3010`（`pnpm dev`）

---

## § 6 关联文档

**ADR（`docs/adr/` 目录）**
- ADR-0001：cp thin proxy 统一接入，业务方不直连 panel
- ADR-0003：panel 仅 127.0.0.1，禁止公网暴露
- ADR-0004：group 自改也需 L2 审计，不自评通过

**memory（`/Users/charleslee/Desktop/YiiicloudeGroup/memory/`）**
- `project_payload_panel_inflight.md` — Phase A-G 迁移完整历史
- `project_dingtalk_org_as_sot_2026_05_10.md` — 7 部门 / 31 员工同步首跑记录
- `feedback_qinyin_4_boss_acl_2026_05_10.md` — 4 boss 硬名单 + sync 强覆盖规则
- `feedback_qinyin_two_tier_acl_only_boss_employee.md` — ACL 两元决策
- `feedback_existing_system_as_sot.md` — 外部系统作 SoT 不双写原则
- `constraint_yiiicloude_api_no_public_exposure.md` — 127.0.0.1 only 约束

**本项目**
- `CLAUDE.md` — 业务红线 + 协作模式（group 直改 + 派审规则）
- `src/collections/Tenants.ts` — tenant 主表 schema（含 boss_user_ids 字段）
- `src/collections/Employees.ts` — 员工镜像 schema（含 role 选项 + 同步策略注释）
- `src/collections/ImBindings.ts` — IM 凭证 schema（含 Fernet 加密 hook）
