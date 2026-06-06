import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const roleLabels: Record<string, string> = {
  boss: '老板',
  dept_head: '部门主管',
  boss_assistant: '老板助理',
  hr_manager: 'HR 经理',
  it_admin: 'IT 管理员',
  project_admin: '项目总管',
  employee: '员工',
}

/**
 * 员工身份镜像（数据来源：钉钉 OpenAPI 同步）+ 业务 role 字段（panel 维护）。
 *
 * plan v2 §A1：钉钉是 SoT，panel 仅作镜像（钉钉同步字段 admin readOnly），
 * 仅 `role` 字段 admin 可改（业务语义，钉钉不提供）。
 *
 * 同步策略：
 *   - 首次全量：control-plane POST /v1/contacts/sync/{tenant_id}
 *   - 增量事件：dingtalk-stream 订阅 user_add_org / user_modify_org / user_leave_org
 *   - cron daily fallback：02:00 全量重同步防漏
 *
 * 查询建议（业务后端 ACL 用）：
 *   where[tenant.tenant_id][equals]=<tid>&where[staff_id][equals]=<staff_id>&where[is_active][equals]=true
 */
export const Employees: CollectionConfig = {
  slug: 'employees',
  labels: { singular: '员工', plural: '员工列表' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['tenant', 'staff_id', 'name', 'department', 'role', 'is_active'],
    group: 'Hermes 配置',
    description:
      '员工身份主表（钉钉同步 + role 业务字段）。同步字段 readOnly；仅 role 可改。',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      const tid = getUserTenantId(user)
      // customer 仅看自己 tenant 的员工
      return tid ? { 'tenant.tenant_id': { equals: tid } } : false
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    afterChange: [
      auditAfterChange({
        summarize: (doc, op, prev) => {
          const r = roleLabels[doc.role] ?? doc.role
          if (op === 'create') return `员工档案创建：${doc.name}（${r}）`
          // 重点关注 role 变化
          if (prev?.role && prev.role !== doc.role) {
            return `员工 ${doc.name} 角色变更：${roleLabels[prev.role] ?? prev.role} → ${r}`
          }
          if (prev?.is_active !== undefined && prev.is_active !== doc.is_active) {
            return `员工 ${doc.name} ${doc.is_active ? '启用' : '禁用'}`
          }
          return `员工档案更新：${doc.name}`
        },
      }),
    ],
    afterDelete: [
      auditAfterDelete({
        summarize: (doc) => `员工档案删除：${doc.name}（${doc.staff_id}）`,
      }),
    ],
  },
  indexes: [
    // 一个 tenant 内 staff_id 唯一（钉钉 userid 在企业内唯一）
    { fields: ['tenant', 'staff_id'], unique: true },
  ],
  fields: [
    {
      name: 'tenant',
      label: '租户',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: '关联到 Tenants collection' },
    },
    {
      name: 'staff_id',
      label: '钉钉员工 ID',
      type: 'text',
      required: true,
      admin: {
        description:
          '钉钉 userid（来自 dingtalk）。一个 tenant 内 unique；同步 worker 写，禁手改',
        readOnly: true,
      },
    },

    // ─── 钉钉同步字段（admin readOnly，仅 sync worker 写） ───
    {
      name: 'name',
      label: '姓名',
      type: 'text',
      required: true,
      admin: { description: '同步自钉钉', readOnly: true },
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'department',
      label: '部门名',
      type: 'text',
      required: true,
      admin: {
        description: '同步自钉钉，跨 tenant 不强约束（自由文本）',
        readOnly: true,
      },
    },
    {
      name: 'department_id',
      label: '部门 ID',
      type: 'text',
      admin: {
        description: '钉钉 dept_id（用于 ACL 跨部门判定，dept_head 仅本部门）',
        readOnly: true,
      },
    },
    {
      name: 'manager_staff_id',
      label: '直属上级 ID',
      type: 'text',
      admin: {
        description: '同步自钉钉 manager_userid；可空（boss 无上级）',
        readOnly: true,
      },
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      admin: { description: '钉钉 free text 职位描述', readOnly: true },
    },
    {
      name: 'is_active',
      label: '在职',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          '同步自钉钉 user_leave_org 事件触发 false。禁用员工的 ACL 调用一律拒绝',
        readOnly: true,
      },
    },
    {
      name: 'dingtalk_synced_at',
      label: '最后同步时间',
      type: 'date',
      admin: {
        description: '最后一次从钉钉同步该员工的时间戳',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },

    // ─── 业务字段（admin 可改，钉钉不提供） ───
    {
      name: 'role',
      label: '业务角色',
      type: 'select',
      required: true,
      defaultValue: 'employee',
      options: [
        { label: '老板 (boss)', value: 'boss' },
        { label: '部门主管 (dept_head)', value: 'dept_head' },
        { label: '老板助理 (boss_assistant)', value: 'boss_assistant' },
        { label: 'HR 经理 (hr_manager)', value: 'hr_manager' },
        { label: 'IT 管理员 (it_admin)', value: 'it_admin' },
        { label: '项目总管 (project_admin)', value: 'project_admin' },
        { label: '员工 (employee)', value: 'employee' },
      ],
      admin: {
        description:
          '决定 ACL 行为。钉钉同步进来默认 employee，客户管理员升级时改。',
      },
    },
  ],
  timestamps: true,
}
