import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const statusLabels: Record<string, string> = {
  prospecting: '洽谈中',
  contracted: '已签合同',
  active: '执行中',
  accepted: '验收完成',
  closed: '已关闭',
}

const createdViaLabels: Record<string, string> = {
  sales_excel: '销售日报立项',
  admin_ui: '后台手建',
  llm_aligned: 'LLM 对齐',
  migration: '历史迁移',
}

/**
 * 项目主数据 SoT（ADR-0013，2026-06-06）。
 *
 * 公司「项目全流程管理」的 canonical 锚：销售部对外洽谈拿到确认后**单向立项**，
 * 赋予唯一项目名（`canonical_name`，tenant 内唯一）；其他部门日报提到该项目时
 * LLM 归一化对齐到这里。
 *
 * 写入路径（唯一）：reports ingest 检测销售部「新建项目」行 → control-plane
 *   `POST /v1/projects`（幂等）→ 本 collection（create/update 限 isAdmin = cp service-account）。
 * 读取路径：reports `scripts/sync_projects_from_panel.py` 直连 panel PG 批量读 →
 *   UPSERT `reports.projects`（只读 mirror，仿 sync_employees）。
 *
 * 角色张力（ADR-0013 D5）：D2「销售建/总管改/部门切片」在 panel admin ACL 做不到
 *   （登录 User 仅 admin/customer，业务角色在 Employees.role）→ 写权限判定放 reports/cp 端，
 *   本 collection create/update/delete 先 isAdmin。
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: '项目', plural: '项目列表' },
  admin: {
    useAsTitle: 'canonical_name',
    defaultColumns: ['tenant', 'canonical_name', 'status', 'owner_staff_id', 'created_via'],
    group: '业务数据',
    description: '项目主数据 SoT（ADR-0013）。销售部单向立项；reports.projects 是只读 mirror。',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      // customer 仅看自己 tenant 的项目
      const tid = getUserTenantId(user)
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
          const s = statusLabels[doc.status] ?? doc.status
          if (op === 'create') return `项目立项：${doc.canonical_name}（${s}）`
          if (prev?.status && prev.status !== doc.status) {
            return `项目 ${doc.canonical_name} 状态变更：${statusLabels[prev.status] ?? prev.status} → ${s}`
          }
          return `项目更新：${doc.canonical_name}`
        },
      }),
    ],
    afterDelete: [
      auditAfterDelete({
        summarize: (doc) => `项目删除：${doc.canonical_name}`,
      }),
    ],
  },
  indexes: [
    // 一个 tenant 内 canonical_name 唯一（全流程流转锚，幂等立项的对齐键）
    { fields: ['tenant', 'canonical_name'], unique: true },
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
      name: 'canonical_name',
      label: '项目唯一名',
      type: 'text',
      required: true,
      admin: {
        description: '全流程流转锚，tenant 内唯一。销售立项时写入，其他部门对齐到此名',
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'prospecting',
      options: [
        { label: '洽谈中', value: 'prospecting' },
        { label: '已签合同', value: 'contracted' },
        { label: '执行中', value: 'active' },
        { label: '验收完成', value: 'accepted' },
        { label: '已关闭', value: 'closed' },
      ],
      admin: {
        description: '5 值生命周期。mirror 时映射到 reports.projects.stage（ADR-0013 D4）',
      },
    },
    {
      name: 'owner_staff_id',
      label: '立项人钉钉 ID',
      type: 'text',
      admin: { description: '发起立项的销售员 staff_id（钉钉 userid 明文）' },
    },
    {
      name: 'participating_departments',
      label: '参与部门',
      type: 'text',
      hasMany: true,
      admin: {
        description: '跨部门参与的部门名列表。本轮只建字段，聚合消费逻辑后续阶段',
      },
    },
    {
      name: 'created_via',
      label: '创建来源',
      type: 'select',
      required: true,
      defaultValue: 'sales_excel',
      options: [
        { label: '销售日报立项', value: 'sales_excel' },
        { label: '后台手建', value: 'admin_ui' },
        { label: 'LLM 对齐', value: 'llm_aligned' },
        { label: '历史迁移', value: 'migration' },
      ],
    },
    {
      name: 'aliases',
      label: '别名历史',
      type: 'text',
      hasMany: true,
      admin: { description: '员工写过的别名变体，用于 LLM 归一化对齐命中' },
    },
    {
      name: 'client_school',
      label: '客户 / 学校',
      type: 'text',
      admin: { description: '项目对应的客户单位或学校名（可空）' },
    },
    {
      name: 'started_at',
      label: '立项日期',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'expected_done_at',
      label: '预计完成日期',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'progress_summary',
      label: '综合完成度',
      type: 'number',
      min: 0,
      max: 100,
      admin: { description: '0-100，cron 跨部门聚合回填。本轮只建字段' },
    },
  ],
  timestamps: true,
}
