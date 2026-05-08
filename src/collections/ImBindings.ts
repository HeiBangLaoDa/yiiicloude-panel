import type { CollectionConfig } from 'payload'
import { getUserTenantId, isAdmin } from '../lib/access'
import { encryptFernet } from '../lib/fernet'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'

const channelLabels: Record<string, string> = {
  dingtalk: '钉钉',
  wecom: '企业微信',
  feishu: '飞书',
}

/**
 * IM 凭证（钉钉 / 企业微信 / 飞书）。
 *
 * 加密策略（Phase B 暂未启用，留 hook stub；Phase B.5 接入 Fernet）：
 *  - app_secret_plain / aes_key_plain：仅用于表单输入，提交后被 hook 加密到 _enc 字段且**不入库**
 *  - app_secret_enc / aes_key_enc：实际入库的密文（与 control-plane 同 Fernet key 兼容）
 *  - 列表展示与读取**不解密**，仅返回 has_app_secret / has_aes_key 布尔
 */
export const ImBindings: CollectionConfig = {
  slug: 'im-bindings',
  labels: { singular: 'IM 凭证', plural: 'IM 凭证' },
  admin: {
    useAsTitle: 'channel',
    defaultColumns: ['tenant', 'channel', 'app_key', 'has_app_secret', 'status'],
    group: '业务数据',
    description: '客户 IM 渠道凭据。1 个 tenant × 1 个 channel 唯一',
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
      label: '渠道',
      type: 'select',
      required: true,
      options: [
        { label: '钉钉', value: 'dingtalk' },
        { label: '企业微信', value: 'wecom' },
        { label: '飞书', value: 'feishu' },
      ],
    },
    {
      name: 'app_key',
      label: '应用 Key',
      type: 'text',
      admin: { description: '钉钉 AppKey / 企微 CorpId / 飞书 App ID' },
    },

    // 明文输入字段（虚字段，hook 处理后会被剥掉，不入库）
    {
      name: 'app_secret_plain',
      label: '应用密钥（明文输入，提交后自动加密）',
      type: 'text',
      virtual: true,
      admin: {
        description: '只在创建/更新时填写。保存后即清空，密文存到下方 app_secret_enc',
        position: 'sidebar',
      },
    },
    {
      name: 'app_secret_enc',
      label: '应用密钥密文',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Fernet 加密结果（不可读）。要更新请填上方明文字段',
      },
    },
    // has_app_secret 是计算字段，前端 / 列表展示用
    {
      name: 'has_app_secret',
      label: '已配密钥',
      type: 'checkbox',
      virtual: true,
      hooks: {
        afterRead: [({ siblingData }) => Boolean(siblingData.app_secret_enc)],
      },
      admin: { readOnly: true, description: '密钥是否已配置（不展示密文）' },
    },

    { name: 'corp_id', label: '企业 ID（CorpId）', type: 'text' },
    { name: 'agent_id', label: '应用 ID（AgentId）', type: 'text' },
    { name: 'callback_token', label: '回调验签 Token', type: 'text' },

    {
      name: 'aes_key_plain',
      label: '回调加密 AES Key（明文，提交后自动加密）',
      type: 'text',
      virtual: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'aes_key_enc',
      label: 'AES Key 密文',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'has_aes_key',
      label: '已配 AES',
      type: 'checkbox',
      virtual: true,
      hooks: {
        afterRead: [({ siblingData }) => Boolean(siblingData.aes_key_enc)],
      },
      admin: { readOnly: true },
    },

    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      required: true,
      options: [
        { label: '生效中', value: 'active' },
        { label: '已停用', value: 'suspended' },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data }) => {
        if (data.app_secret_plain) {
          data.app_secret_enc = encryptFernet(String(data.app_secret_plain))
        }
        delete data.app_secret_plain
        if (data.aes_key_plain) {
          data.aes_key_enc = encryptFernet(String(data.aes_key_plain))
        }
        delete data.aes_key_plain
        return data
      },
    ],
    afterChange: [
      auditAfterChange({
        summarize: (doc, op) => {
          const ch = channelLabels[doc.channel] ?? doc.channel
          if (op === 'create') return `配置 ${ch} 渠道接入凭证`
          return `更新 ${ch} 渠道凭证（状态：${doc.status}）`
        },
      }),
    ],
    afterDelete: [
      auditAfterDelete({
        summarize: (doc) => `删除 ${channelLabels[doc.channel] ?? doc.channel} 渠道凭证`,
      }),
    ],
  },
  indexes: [
    { fields: ['tenant', 'channel'], unique: true },
  ],
  timestamps: true,
}
