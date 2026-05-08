import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const moduleLabels: Record<string, string> = {
  yguard: '数据安全',
  reports: '智能报表',
}
const planLabels: Record<string, string> = { trial: '试用', standard: '标准', pro: '专业' }
const statusLabels: Record<string, string> = {
  active: '正常',
  suspended: '已暂停',
  expired: '已过期',
}

/** 模块订阅。1 个 tenant × 1 个 module 唯一（control-plane 有 unique 约束） */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: '订阅', plural: '模块订阅' },
  admin: {
    useAsTitle: 'module_id',
    defaultColumns: ['tenant', 'module_id', 'plan', 'status', 'quota_used', 'quota_monthly', 'expires_at'],
    group: '业务数据',
    description: '客户开通的模块（数据安全 / 智能报表）+ 套餐与配额',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      const tid = getUserTenantId(user)
      return tid ? { tenant: { equals: tid } } : false
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'tenant',
      label: '客户',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { description: '关联的客户' },
    },
    {
      name: 'module_id',
      label: '模块',
      type: 'select',
      required: true,
      options: [
        { label: '数据安全（yguard）', value: 'yguard' },
        { label: '智能报表（reports）', value: 'reports' },
      ],
    },
    {
      name: 'plan',
      label: '套餐',
      type: 'select',
      required: true,
      defaultValue: 'trial',
      options: [
        { label: '试用', value: 'trial' },
        { label: '标准', value: 'standard' },
        { label: '专业', value: 'pro' },
      ],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: '正常', value: 'active' },
        { label: '已暂停', value: 'suspended' },
        { label: '已过期', value: 'expired' },
      ],
    },
    {
      name: 'started_at',
      label: '开始时间',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'expires_at',
      label: '到期时间',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' }, description: '留空 = 永久' },
    },
    {
      name: 'quota_monthly',
      label: '月配额',
      type: 'number',
      required: true,
      defaultValue: 1000,
    },
    {
      name: 'quota_used',
      label: '已用',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: { description: '本月已消耗，由系统自动更新；运营手动改通常表示重置' },
    },
    {
      name: 'config',
      label: '模块自定义配置',
      type: 'json',
      admin: { description: '模块特定参数（JSON）。比如 reports 的报表模板 ID' },
    },
  ],
  // tenant + module_id 唯一约束（与 control-plane 一致）
  indexes: [
    {
      fields: ['tenant', 'module_id'],
      unique: true,
    },
  ],
  hooks: {
    afterChange: [
      auditAfterChange({
        summarize: (doc, op, prev) => {
          const mod = moduleLabels[doc.module_id] ?? doc.module_id
          if (op === 'create') {
            return `开通模块：${mod}（${planLabels[doc.plan] ?? doc.plan}）`
          }
          // update：只挑跟客户最相关的变化
          const changes: string[] = []
          if (prev?.plan !== doc.plan) {
            changes.push(`套餐 ${planLabels[prev?.plan] ?? prev?.plan} → ${planLabels[doc.plan] ?? doc.plan}`)
          }
          if (prev?.status !== doc.status) {
            changes.push(`状态 ${statusLabels[prev?.status] ?? prev?.status} → ${statusLabels[doc.status] ?? doc.status}`)
          }
          if (prev?.quota_monthly !== doc.quota_monthly) {
            changes.push(`月配额 ${prev?.quota_monthly} → ${doc.quota_monthly}`)
          }
          const tail = changes.length ? `：${changes.join('、')}` : ''
          return `订阅更新（${mod}）${tail}`
        },
      }),
    ],
    afterDelete: [
      auditAfterDelete({
        summarize: (doc) =>
          `取消模块：${moduleLabels[doc.module_id] ?? doc.module_id}`,
      }),
    ],
  },
  timestamps: true,
}
