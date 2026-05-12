import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'
import { actorOf } from '../hooks/audit'

/**
 * 集团产品矩阵（系统级，无 tenant 隔离）。
 *
 * 每条记录描述一个子模块的中文产品名、卖点、主要能力、典型用户问法、引导话术。
 * control-plane provision_worker 拉取此表，写入 SOUL.md 的"集团产品矩阵"段，
 * 让 LLM 在用户问到未订阅模块时主动引导购买，而不是机械拒绝或凭脑补乱答。
 */
export const ProductModules: CollectionConfig = {
  slug: 'product-modules',
  labels: { singular: '产品模块', plural: '产品矩阵' },
  admin: {
    useAsTitle: 'label_zh',
    defaultColumns: ['module_id', 'label_zh', 'tagline', 'active', 'order'],
    group: '产品定义',
    description: '集团子模块产品元信息（卖点 + 引导话术），供 SOUL.md 渲染使用',
  },
  access: {
    // admin / service-account 全权 CRUD；customer 禁止读写（集团内部产品定义）
    read: ({ req: { user } }) => (user && isAdmin(user) ? true : false),
    create: ({ req: { user } }) => (user ? isAdmin(user) : false),
    update: ({ req: { user } }) => (user ? isAdmin(user) : false),
    delete: ({ req: { user } }) => (user ? isAdmin(user) : false),
  },
  fields: [
    {
      name: 'module_id',
      label: '模块 ID',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: '与 Subscriptions.module_id 严格对齐：yguard / reports（未来扩展时新增行）',
      },
    },
    {
      name: 'label_zh',
      label: '中文产品名',
      type: 'text',
      required: true,
      admin: { description: '如"数据安全"、"智能报表"' },
    },
    {
      name: 'tagline',
      label: '一句话卖点',
      type: 'text',
      required: true,
      admin: { description: '≤80 字符，用于 SOUL.md 摘要段和 handler 拒绝文案' },
    },
    {
      name: 'key_features',
      label: '主要能力',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 8,
      admin: { description: '3-5 条，每条 ≤50 字符' },
      fields: [
        {
          name: 'value',
          label: '能力描述',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'target_audience',
      label: '适用场景',
      type: 'textarea',
      admin: { description: '面向哪类客户、适合什么场景' },
    },
    {
      name: 'trigger_examples',
      label: '典型用户问法',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 10,
      admin: { description: '3-6 条，让 LLM 学会识别"这是 X 模块的需求"' },
      fields: [
        {
          name: 'value',
          label: '问法示例',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'upsell_cta',
      label: '引导话术',
      type: 'text',
      required: true,
      admin: { description: '如"请联系贵司客户经理或运营开通"；LLM 引用此字段生成回复' },
    },
    {
      name: 'order',
      label: '排序权重',
      type: 'number',
      defaultValue: 100,
      admin: { description: '数字越小越靠前；默认 100' },
    },
    {
      name: 'active',
      label: '是否启用',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: '停售产品设 false，不进入 SOUL.md 产品矩阵段' },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        const action =
          operation === 'create' ? 'product_module.created' : 'product_module.updated'
        try {
          await req.payload.create({
            collection: 'audit-log',
            data: {
              actor: actorOf(req),
              action,
              target: `product-modules/${doc.id}`,
              summary: `产品模块${operation === 'create' ? '创建' : '更新'}：${doc.label_zh}（${doc.module_id}）`,
            },
          })
        } catch (e) {
          req.payload.logger.error({ err: e }, '[audit] ProductModules afterChange write failed')
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        try {
          await req.payload.create({
            collection: 'audit-log',
            data: {
              actor: actorOf(req),
              action: 'product_module.deleted',
              target: `product-modules/${doc.id}`,
              summary: `产品模块删除：${doc.label_zh}（${doc.module_id}）`,
            },
          })
        } catch (e) {
          req.payload.logger.error({ err: e }, '[audit] ProductModules afterDelete write failed')
        }
      },
    ],
  },
  timestamps: true,
}
