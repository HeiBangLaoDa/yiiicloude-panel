'use client'

import { Empty, Progress, Table, Tag, Typography } from 'antd'
import React from 'react'

import type { Subscription } from '@/payload-types'

const { Title, Text } = Typography

const moduleLabels: Record<string, string> = {
  yguard: '数据安全',
  reports: '智能报表',
}

const planLabels: Record<string, { text: string; color: string }> = {
  trial: { text: '试用', color: 'default' },
  standard: { text: '标准', color: 'blue' },
  pro: { text: '专业', color: 'gold' },
}

const statusLabels: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: 'green' },
  suspended: { text: '已暂停', color: 'orange' },
  expired: { text: '已过期', color: 'red' },
}

function fmtDate(iso?: string | null) {
  if (!iso) return '永久'
  return new Date(iso).toLocaleDateString('zh-CN')
}

export function SubscriptionsView({ items }: { items: Subscription[] }) {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        模块订阅
      </Title>
      <Text type="secondary">查看当前已开通的模块、套餐与配额</Text>

      <div style={{ marginTop: 16 }}>
        {items.length === 0 ? (
          <Empty description="尚未开通任何模块" style={{ padding: '60px 0' }} />
        ) : (
          <Table
            rowKey="id"
            dataSource={items}
            pagination={false}
            columns={[
              {
                title: '模块',
                dataIndex: 'module_id',
                render: (v: string) => <Tag color="blue">{moduleLabels[v] ?? v}</Tag>,
                width: 140,
              },
              {
                title: '套餐',
                dataIndex: 'plan',
                render: (v: string) => {
                  const p = planLabels[v] ?? { text: v, color: 'default' }
                  return <Tag color={p.color}>{p.text}</Tag>
                },
                width: 100,
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
              {
                title: '本月用量',
                render: (_, row: Subscription) => {
                  const used = row.quota_used ?? 0
                  const total = row.quota_monthly ?? 0
                  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
                  return (
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontSize: 12, marginBottom: 4 }}>
                        {used.toLocaleString()} / {total.toLocaleString()}
                      </div>
                      <Progress
                        percent={percent}
                        size="small"
                        status={percent >= 100 ? 'exception' : 'active'}
                      />
                    </div>
                  )
                },
              },
              {
                title: '开始时间',
                dataIndex: 'started_at',
                render: (v: string) => fmtDate(v),
                width: 130,
              },
              {
                title: '到期时间',
                dataIndex: 'expires_at',
                render: (v: string | null | undefined) => fmtDate(v),
                width: 130,
              },
            ]}
          />
        )}
      </div>

      <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
        如需调整套餐或新增模块，请联系您的客户经理。
      </Text>
    </div>
  )
}
