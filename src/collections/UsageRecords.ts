import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'

/**
 * 调用日志。**只读** —— 由后端业务自动追加，运营和客户都不能从 admin 改/删
 *
 * 创建路径（Phase 后续）：
 *  - control-plane FastAPI 在 yguard / reports 调用 LLM 后，调 Payload REST POST /api/usage-records
 *  - Payload 用 API Key 鉴权（Phase F 配 MCP 时一并发放）
 */
export const UsageRecords: CollectionConfig = {
  slug: 'usage-records',
  labels: { singular: '调用记录', plural: '用量记录' },
  admin: {
    useAsTitle: 'occurred_at',
    defaultColumns: ['tenant', 'module_id', 'channel', 'tokens_in', 'tokens_out', 'cost_cents', 'occurred_at'],
    group: '业务数据',
    description: '只读。由后端业务自动追加，admin 仅查看与导出',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      const tid = getUserTenantId(user)
      return tid ? { tenant: { equals: tid } } : false
    },
    // 数据由后端 API 写入，前端不允许 update/delete
    create: () => true,  // API 写入路径需要；具体由 API key 权限二次约束（Phase F 收紧）
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'tenant', label: '客户', type: 'relationship', relationTo: 'tenants', required: true },
    {
      name: 'module_id',
      label: '模块',
      type: 'select',
      required: true,
      options: [
        { label: '数据安全（ipguard）', value: 'ipguard' },
        { label: '智能报表（reports）', value: 'reports' },
      ],
    },
    {
      name: 'channel',
      label: '渠道',
      type: 'select',
      options: [
        { label: '钉钉', value: 'dingtalk' },
        { label: '企业微信', value: 'wecom' },
        { label: '飞书', value: 'feishu' },
      ],
    },
    {
      name: 'occurred_at',
      label: '发生时间',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'tokens_in', label: '输入 token', type: 'number', defaultValue: 0, required: true },
    { name: 'tokens_out', label: '输出 token', type: 'number', defaultValue: 0, required: true },
    { name: 'cost_cents', label: '成本（分）', type: 'number', defaultValue: 0, required: true },
  ],
  timestamps: true,
}
