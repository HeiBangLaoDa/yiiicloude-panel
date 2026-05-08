import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { auditAfterChange } from '../hooks/audit'

/**
 * 客户/租户主表。对齐 control-plane Postgres `tenant` 表的核心字段。
 *
 * 与 control-plane 的差异：
 *  - 弃用 `wecom_*` 字段（已被 ImBindings 替代）
 *  - `boss_user_ids` 改为字符串（control-plane 是 text，逻辑上可存逗号分隔的多 ID）
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: { singular: '客户', plural: '客户列表' },
  admin: {
    useAsTitle: 'company_name',
    defaultColumns: ['tenant_id', 'company_name', 'industry', 'plan', 'status'],
    group: '业务数据',
    description: '运营录入的客户主体，所有订阅/路由/IM 凭证都挂在 tenant 下',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      // customer 角色只能看到自己 tenant
      const tid = getUserTenantId(user)
      return tid ? { id: { equals: tid } } : false
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: () => false,
  },
  fields: [
    {
      name: 'tenant_id',
      label: '客户编号',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: '小写英数+下划线，3-32 位，如 acme_corp。一旦创建不可改' },
    },
    {
      name: 'company_name',
      label: '公司全称',
      type: 'text',
      required: true,
      admin: { description: '营业执照上的全称' },
    },
    {
      name: 'industry',
      label: '行业',
      type: 'select',
      defaultValue: 'general',
      options: [
        { label: '科技', value: 'tech' },
        { label: '金融', value: 'finance' },
        { label: '制造', value: 'manufacturing' },
        { label: '零售', value: 'retail' },
        { label: '教育', value: 'education' },
        { label: '通用', value: 'general' },
      ],
    },
    {
      name: 'plan',
      label: '套餐',
      type: 'select',
      defaultValue: 'standard',
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
      defaultValue: 'active',
      options: [
        { label: '正常', value: 'active' },
        { label: '已暂停', value: 'suspended' },
      ],
    },
    {
      name: 'boss_user_ids',
      label: '老板钉钉/企微员工 ID（逗号分隔多个）',
      type: 'text',
      admin: { description: '用于报表抬头与权限识别。多个 ID 用英文逗号隔开' },
    },
    {
      name: 'monthly_quota',
      label: '月调用额度',
      type: 'number',
      defaultValue: 1000,
      admin: { description: '每个自然月可调用 LLM 的总次数上限（兜底，模块级配额由订阅控制）' },
    },
  ],
  hooks: {
    afterChange: [
      auditAfterChange({
        summarize: (doc, op) => {
          if (op === 'create') return `客户档案创建：${doc.company_name}`
          return `客户档案更新（套餐：${doc.plan} / 状态：${doc.status}）`
        },
      }),
    ],
  },
  timestamps: true,
}
