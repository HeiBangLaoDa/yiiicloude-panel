'use client'

import { Alert, Empty, Table, Tag, Typography } from 'antd'
import React from 'react'

import type { ImBinding } from '@/payload-types'

const { Title, Text } = Typography

const channelLabels: Record<string, { text: string; color: string }> = {
  dingtalk: { text: '钉钉', color: 'blue' },
  wecom: { text: '企业微信', color: 'green' },
  feishu: { text: '飞书', color: 'cyan' },
}

const statusLabels: Record<string, { text: string; color: string }> = {
  active: { text: '生效中', color: 'green' },
  suspended: { text: '已停用', color: 'orange' },
}

function masked(has: boolean) {
  return has ? <Tag color="green">已配置</Tag> : <Tag color="default">未配置</Tag>
}

export function ImConfigView({ items }: { items: ImBinding[] }) {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        IM 配置
      </Title>
      <Text type="secondary">当前客户开通的钉钉 / 企业微信 / 飞书等渠道接入凭证</Text>

      <Alert
        type="info"
        showIcon
        style={{ margin: '16px 0' }}
        message="敏感字段（应用密钥 / 回调 AES Key）出于安全考虑不展示明文，仅显示是否已配置。如需新增、修改或停用渠道，请联系您的客户经理。"
      />

      {items.length === 0 ? (
        <Empty description="尚未接入任何 IM 渠道" style={{ padding: '60px 0' }} />
      ) : (
        <Table
          rowKey="id"
          dataSource={items}
          pagination={false}
          columns={[
            {
              title: '渠道',
              dataIndex: 'channel',
              render: (v: string) => {
                const c = channelLabels[v] ?? { text: v, color: 'default' }
                return <Tag color={c.color}>{c.text}</Tag>
              },
              width: 120,
            },
            {
              title: '应用 Key',
              dataIndex: 'app_key',
              render: (v: string | null | undefined) => v || <Text type="secondary">-</Text>,
            },
            {
              title: '企业 ID',
              dataIndex: 'corp_id',
              render: (v: string | null | undefined) => v || <Text type="secondary">-</Text>,
            },
            {
              title: '应用 ID',
              dataIndex: 'agent_id',
              render: (v: string | null | undefined) => v || <Text type="secondary">-</Text>,
              width: 140,
            },
            {
              title: '应用密钥',
              render: (_, row: ImBinding) => masked(Boolean(row.app_secret_enc)),
              width: 110,
            },
            {
              title: '回调 AES',
              render: (_, row: ImBinding) => masked(Boolean(row.aes_key_enc)),
              width: 110,
            },
            {
              title: '状态',
              dataIndex: 'status',
              render: (v: string) => {
                const s = statusLabels[v] ?? { text: v, color: 'default' }
                return <Tag color={s.color}>{s.text}</Tag>
              },
              width: 100,
            },
          ]}
        />
      )}
    </div>
  )
}
