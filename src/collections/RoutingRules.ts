import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'

/** 消息路由规则。客户的 IM 消息按这些规则分发到目标模块 */
export const RoutingRules: CollectionConfig = {
  slug: 'routing-rules',
  labels: { singular: '路由规则', plural: '路由规则' },
  admin: {
    useAsTitle: 'pattern',
    defaultColumns: ['tenant', 'channel', 'match_type', 'pattern', 'target_module_id', 'priority', 'enabled'],
    group: '业务数据',
    description: '消息分发规则。priority 数字小先匹配，default 兜底放最后',
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
    { name: 'tenant', label: '客户', type: 'relationship', relationTo: 'tenants', required: true },
    {
      name: 'channel',
      label: 'IM 渠道',
      type: 'select',
      required: true,
      options: [
        { label: '钉钉', value: 'dingtalk' },
        { label: '企业微信', value: 'wecom' },
        { label: '飞书', value: 'feishu' },
        { label: '全部', value: '*' },
      ],
    },
    {
      name: 'match_type',
      label: '匹配方式',
      type: 'select',
      required: true,
      options: [
        { label: '前缀匹配（prefix）', value: 'prefix' },
        { label: '@ 提及（mention）', value: 'mention' },
        { label: '智能识别（LLM）', value: 'llm' },
        { label: '兜底默认（default）', value: 'default' },
      ],
    },
    {
      name: 'pattern',
      label: '匹配文本',
      type: 'text',
      admin: {
        description: '前缀类型填「/report」；@提及类型填「@报表」；兜底类型留空',
      },
    },
    {
      name: 'target_module_id',
      label: '目标模块',
      type: 'select',
      required: true,
      options: [
        { label: '数据安全（ipguard）', value: 'ipguard' },
        { label: '智能报表（reports）', value: 'reports' },
      ],
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'number',
      defaultValue: 100,
      required: true,
      admin: { description: '数字越小越先匹配。建议：前缀 10、@提及 20、兜底 999' },
    },
    {
      name: 'enabled',
      label: '已启用',
      type: 'checkbox',
      defaultValue: true,
      required: true,
    },
  ],
  timestamps: true,
}
