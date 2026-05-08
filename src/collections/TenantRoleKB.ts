import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { auditAfterChange } from '../hooks/audit'

/**
 * 每租户每**角色**的 SOUL 模板、可见字段、红线规则。
 *
 * v2（2026-05-08）：去除 module 维度。原因：plan v2 是 1 tenant=1 通用机器人多模块共用，
 * SOUL.md 在 tenant 级合成（含所有 module skill 调用指南 + 多角色段），不再 per-module 切分。
 *
 * 查询建议：
 *   where[tenant.tenant_id][equals]=<tid>&where[is_active][equals]=true
 */
export const TenantRoleKB: CollectionConfig = {
  slug: 'tenant-role-kb',
  labels: { singular: '角色 SOUL 模板', plural: '角色 SOUL 模板库' },
  admin: {
    useAsTitle: 'role',
    defaultColumns: ['tenant', 'role', 'is_active', 'updatedAt'],
    group: 'Hermes 配置',
    description:
      '每租户每角色的 SOUL 模板、可见字段、红线规则。control-plane provision worker 拉这些数据渲染 hermes profile 的 SOUL.md（tenant 级合成，不再 per-module）',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      const tid = getUserTenantId(user)
      // customer 只能看到自己 tenant 的 KB（通过 tenant.tenant_id dot-notation 过滤）
      return tid ? { 'tenant.tenant_id': { equals: tid } } : false
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  hooks: {
    afterChange: [
      auditAfterChange({
        summarize: (doc, op) => {
          if (op === 'create') return `SOUL 模板创建：role=${doc.role}`
          return `SOUL 模板更新：role=${doc.role}`
        },
      }),
    ],
  },
  indexes: [
    // tenant + role 唯一（一个 tenant 每个角色一条 KB）
    { fields: ['tenant', 'role'], unique: true },
  ],
  fields: [
    {
      name: 'tenant',
      label: '租户',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: '关联到 Tenants collection；通过 tenant.tenant_id 查询' },
    },
    {
      name: 'role',
      label: '角色',
      type: 'select',
      required: true,
      options: [
        { label: '老板 (boss)', value: 'boss' },
        { label: '部门主管 (dept_head)', value: 'dept_head' },
        { label: '老板助理 (boss_assistant)', value: 'boss_assistant' },
        { label: 'HR 经理 (hr_manager)', value: 'hr_manager' },
        { label: 'IT 管理员 (it_admin)', value: 'it_admin' },
        { label: '员工 (employee)', value: 'employee' },
        { label: '默认（总则段）(default)', value: 'default' },
      ],
      admin: {
        description:
          '业务角色，决定 SOUL.md 的 ## 当面对 X 段渲染。default 段是总则（不限角色）',
      },
    },
    {
      name: 'soul_template',
      label: 'SOUL 模板（Markdown）',
      type: 'textarea',
      required: true,
      admin: {
        description:
          '渲染到 hermes profile SOUL.md 的对应角色段。可用占位符 {{peer_role}} / {{tenant_id}} / {{module}}（control-plane provision worker 渲染时替换）',
        rows: 12,
      },
    },
    {
      name: 'visible_fields',
      label: '可见字段（数组）',
      type: 'array',
      fields: [
        {
          name: 'field',
          type: 'text',
          required: true,
          admin: {
            description: '业务字段名，如 employee_name / device_serial / file_name',
          },
        },
      ],
      admin: {
        description:
          '本角色可见的业务字段列表；未列出的字段在响应中脱敏（控制由 hermes skill handler 实施，本 collection 仅声明）',
      },
    },
    {
      name: 'red_lines',
      label: '红线规则（数组）',
      type: 'array',
      fields: [
        {
          name: 'rule',
          type: 'text',
          required: true,
          admin: {
            description: '规则文本，如 "不显示真实姓名" / "不显示原始 SQL"',
          },
        },
      ],
      admin: {
        description:
          '注入到 SOUL.md 总则段；hermes prompt 显式提醒 LLM 遵守',
      },
    },
    {
      name: 'is_active',
      label: '启用',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: '仅启用的 KB 被 provision worker 拉取并渲染' },
    },
  ],
  timestamps: true,
}
