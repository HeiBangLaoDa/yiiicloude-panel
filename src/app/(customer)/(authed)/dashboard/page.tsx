import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { getCurrentUser } from '@/lib/server-auth'
import type { Subscription, UsageRecord } from '@/payload-types'
import { DashboardView } from './DashboardView'

function startOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

/** 取本地时区 YYYY-MM-DD（en-CA 给 ISO 风格） */
function localDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const payload = await getPayload({ config: await config })
  const findArgs = { user, overrideAccess: false } as const

  const monthStart = startOfMonthISO()
  const [usageThisMonth, recentUsage, subscriptions] = await Promise.all([
    payload.find({
      collection: 'usage-records',
      ...findArgs,
      limit: 5000,
      where: { occurred_at: { greater_than_equal: monthStart } },
    }),
    payload.find({
      collection: 'usage-records',
      ...findArgs,
      limit: 10,
      sort: '-occurred_at',
    }),
    payload.find({
      collection: 'subscriptions',
      ...findArgs,
      limit: 100,
    }),
  ])

  // KPI 累计
  let tokensTotal = 0
  for (const r of usageThisMonth.docs as UsageRecord[]) {
    tokensTotal += (r.tokens_in ?? 0) + (r.tokens_out ?? 0)
  }

  // 7 天趋势：构造日期桶
  const today = new Date()
  const trendBuckets: { date: string; label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const dateKey = d.toLocaleDateString('en-CA')
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    trendBuckets.push({ date: dateKey, label, count: 0 })
  }
  const dateToIdx = new Map(trendBuckets.map((b, i) => [b.date, i]))

  // 渠道 / 模块 分布
  const channelDist: Record<string, number> = {}
  const moduleDist: Record<string, number> = {}
  for (const r of usageThisMonth.docs as UsageRecord[]) {
    if (r.occurred_at) {
      const k = localDateKey(r.occurred_at)
      const idx = dateToIdx.get(k)
      if (idx !== undefined) trendBuckets[idx].count += 1
    }
    if (r.channel) channelDist[r.channel] = (channelDist[r.channel] ?? 0) + 1
    if (r.module_id) moduleDist[r.module_id] = (moduleDist[r.module_id] ?? 0) + 1
  }

  const subs = subscriptions.docs as Subscription[]
  const activeSubsCount = subs.filter((s) => s.status === 'active').length

  // 配额逼近：>= 80% 标黄，>= 100% 标红
  const quotaAlerts = subs
    .filter((s) => s.status === 'active' && (s.quota_monthly ?? 0) > 0)
    .map((s) => ({
      id: s.id,
      module_id: s.module_id,
      used: s.quota_used ?? 0,
      total: s.quota_monthly ?? 0,
      percent: Math.round(((s.quota_used ?? 0) / (s.quota_monthly ?? 1)) * 100),
    }))
    .filter((a) => a.percent >= 80)
    .sort((a, b) => b.percent - a.percent)

  return (
    <DashboardView
      stats={{
        usageCount: usageThisMonth.totalDocs ?? 0,
        tokensTotal,
        activeSubsCount,
        totalSubsCount: subs.length,
      }}
      trend={trendBuckets}
      channelDist={Object.entries(channelDist).map(([k, v]) => ({ name: k, value: v }))}
      moduleDist={Object.entries(moduleDist).map(([k, v]) => ({ name: k, value: v }))}
      quotaAlerts={quotaAlerts}
      recentUsage={recentUsage.docs as UsageRecord[]}
    />
  )
}
