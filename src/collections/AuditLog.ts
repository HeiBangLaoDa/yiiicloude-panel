import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'

/**
 * 审计日志。
 *
 * 写入路径：
 *  - Tenants / Subscriptions / ImBindings 的 afterChange hook 自动追加（含 tenant 关联）
 *  - control-plane / yguard 通过 REST 写入业务级事件
 *
 * 客户面 /activity 消费此表（按 tenant 过滤）。
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: '审计记录', plural: '审计日志' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['actor', 'action', 'target', 'tenant', 'createdAt'],
    group: '系统',
    description: '只读。所有写操作的痕迹都在这里',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      const tid = getUserTenantId(user)
      return tid ? { tenant: { equals: tid } } : false
    },
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'tenant',
      label: '所属客户',
      type: 'relationship',
      relationTo: 'tenants',
      admin: { description: '事件归属客户。系统级事件可留空' },
    },
    {
      name: 'actor',
      label: '操作人 / 系统',
      type: 'text',
      required: true,
      admin: { description: 'user.email 或系统标识，如 system / mcp:agent-name' },
    },
    {
      name: 'action',
      label: '动作',
      type: 'text',
      required: true,
      admin: { description: '如 tenants.create / subscriptions.update / im-bindings.delete' },
    },
    {
      name: 'target',
      label: '目标',
      type: 'text',
      admin: { description: 'collection slug 加 ID，如 tenants/abc123' },
    },
    {
      name: 'summary',
      label: '摘要',
      type: 'text',
      admin: { description: '一句话描述（客户面展示用）' },
    },
    {
      name: 'payload',
      label: '载荷',
      type: 'json',
      admin: { description: '改动内容 / 调用参数' },
    },
  ],
  timestamps: true,
}
