'use client'

import { Empty, Table, Tag, Typography } from 'antd'
import React from 'react'

import type { AuditLog } from '@/payload-types'

const { Title, Text } = Typography

function actionTagColor(action: string) {
  if (action.endsWith('.create')) return 'green'
  if (action.endsWith('.update')) return 'blue'
  if (action.endsWith('.delete')) return 'red'
  return 'default'
}

function actionLabel(action: string) {
  if (action.endsWith('.create')) return '新增'
  if (action.endsWith('.update')) return '修改'
  if (action.endsWith('.delete')) return '删除'
  return action
}

const collectionLabels: Record<string, string> = {
  tenants: '客户档案',
  subscriptions: '模块订阅',
  'im-bindings': 'IM 凭证',
  'routing-rules': '路由规则',
}

function collectionLabel(action: string) {
  const slug = action.split('.')[0]
  return collectionLabels[slug] ?? slug
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

export function ActivityView({ items }: { items: AuditLog[] }) {
  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        活动日志
      </Title>
      <Text type="secondary">
        本客户的所有关键变更记录（运营改了你的订阅 / 配置 / IM 凭证都会出现在这里）
      </Text>

      <div style={{ marginTop: 16 }}>
        {items.length === 0 ? (
          <Empty description="暂无活动记录" style={{ padding: '60px 0' }} />
        ) : (
          <Table
            rowKey="id"
            dataSource={items}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            columns={[
              {
                title: '时间',
                dataIndex: 'createdAt',
                render: (v: string) => fmtDateTime(v),
                width: 180,
              },
              {
                title: '类型',
                dataIndex: 'action',
                render: (v: string) => (
                  <span>
                    <Tag color={actionTagColor(v)}>{actionLabel(v)}</Tag>
                    <Text type="secondary">{collectionLabel(v)}</Text>
                  </span>
                ),
                width: 180,
              },
              {
                title: '摘要',
                dataIndex: 'summary',
                render: (v: string | null | undefined, row: AuditLog) =>
                  v || <Text type="secondary">{row.action}</Text>,
              },
              {
                title: '操作者',
                dataIndex: 'actor',
                render: (v: string) => <Text code>{v}</Text>,
                width: 200,
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}
