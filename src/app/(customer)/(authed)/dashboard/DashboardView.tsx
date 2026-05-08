'use client'

import { Alert, Card, Col, Empty, Progress, Row, Statistic, Table, Tag, Typography } from 'antd'
import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { UsageRecord } from '@/payload-types'

const { Title, Text } = Typography

const moduleLabels: Record<string, string> = {
  ipguard: '数据安全',
  reports: '智能报表',
}

const channelLabels: Record<string, string> = {
  dingtalk: '钉钉',
  wecom: '企业微信',
  feishu: '飞书',
}

const channelColors: Record<string, string> = {
  dingtalk: '#1677ff',
  wecom: '#52c41a',
  feishu: '#13c2c2',
}

const moduleColors: Record<string, string> = {
  ipguard: '#722ed1',
  reports: '#fa8c16',
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

interface Stats {
  usageCount: number
  tokensTotal: number
  activeSubsCount: number
  totalSubsCount: number
}

interface TrendPoint {
  date: string
  label: string
  count: number
}

interface DistPoint {
  name: string
  value: number
}

interface QuotaAlert {
  id: number
  module_id: string
  used: number
  total: number
  percent: number
}

export function DashboardView({
  stats,
  trend,
  channelDist,
  moduleDist,
  quotaAlerts,
  recentUsage,
}: {
  stats: Stats
  trend: TrendPoint[]
  channelDist: DistPoint[]
  moduleDist: DistPoint[]
  quotaAlerts: QuotaAlert[]
  recentUsage: UsageRecord[]
}) {
  const hasTrend = trend.some((p) => p.count > 0)
  const hasChannel = channelDist.length > 0
  const hasModule = moduleDist.length > 0

  return (
    <div>
      <Title level={3} style={{ marginTop: 0 }}>
        概览
      </Title>
      <Text type="secondary">本月数据 · {new Date().toLocaleDateString('zh-CN')}</Text>

      {/* 顶部 KPI 三卡 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="本月调用次数" value={stats.usageCount} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="本月 token 总量" value={stats.tokensTotal} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="生效订阅"
              value={stats.activeSubsCount}
              suffix={`/ ${stats.totalSubsCount}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 配额逼近警示 */}
      {quotaAlerts.length > 0 && (
        <Alert
          type={quotaAlerts.some((a) => a.percent >= 100) ? 'error' : 'warning'}
          showIcon
          style={{ marginTop: 16 }}
          message={`有 ${quotaAlerts.length} 个模块的本月配额接近上限`}
          description={
            <div style={{ marginTop: 8 }}>
              {quotaAlerts.map((a) => (
                <div key={a.id} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 2,
                    }}
                  >
                    <Text strong>{moduleLabels[a.module_id] ?? a.module_id}</Text>
                    <Text type={a.percent >= 100 ? 'danger' : 'warning'}>
                      {a.used.toLocaleString()} / {a.total.toLocaleString()}（{a.percent}%）
                    </Text>
                  </div>
                  <Progress
                    percent={Math.min(100, a.percent)}
                    size="small"
                    showInfo={false}
                    status={a.percent >= 100 ? 'exception' : 'active'}
                  />
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* 7 天调用趋势 */}
      <Title level={4} style={{ marginTop: 32 }}>
        近 7 天调用趋势
      </Title>
      <Card>
        {hasTrend ? (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="调用次数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty description="近 7 天暂无调用记录" />
        )}
      </Card>

      {/* 渠道 + 模块分布 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="渠道分布（本月）">
            {hasChannel ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={channelDist.map((d) => ({
                        ...d,
                        label: channelLabels[d.name] ?? d.name,
                      }))}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {channelDist.map((d) => (
                        <Cell
                          key={d.name}
                          fill={channelColors[d.name] ?? '#8884d8'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="本月暂无渠道数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="模块分布（本月）">
            {hasModule ? (
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={moduleDist.map((d) => ({
                      ...d,
                      label: moduleLabels[d.name] ?? d.name,
                    }))}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="调用次数">
                      {moduleDist.map((d) => (
                        <Cell key={d.name} fill={moduleColors[d.name] ?? '#8884d8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty description="本月暂无模块数据" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 最近调用 */}
      <Title level={4} style={{ marginTop: 32 }}>
        最近调用
      </Title>
      {recentUsage.length === 0 ? (
        <Empty description="本月暂无调用记录" />
      ) : (
        <Table
          rowKey="id"
          dataSource={recentUsage}
          pagination={false}
          size="middle"
          columns={[
            {
              title: '时间',
              dataIndex: 'occurred_at',
              render: (v: string) => fmtDateTime(v),
              width: 180,
            },
            {
              title: '模块',
              dataIndex: 'module_id',
              render: (v: string) => <Tag color="blue">{moduleLabels[v] ?? v}</Tag>,
              width: 120,
            },
            {
              title: '渠道',
              dataIndex: 'channel',
              render: (v: string | null) => (v ? channelLabels[v] ?? v : '-'),
              width: 100,
            },
            { title: '输入 token', dataIndex: 'tokens_in', align: 'right', width: 140 },
            { title: '输出 token', dataIndex: 'tokens_out', align: 'right', width: 140 },
          ]}
        />
      )}
    </div>
  )
}
