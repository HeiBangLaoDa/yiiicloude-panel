import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import type { Tenant } from '@/payload-types'
import { TenantsOverviewView } from './TenantsOverviewView'

export default async function OpsOverviewPage() {
  const payload = await getPayload({ config: await config })

  const result = await payload.find({
    collection: 'tenants',
    limit: 100,
    overrideAccess: true,
  })

  // 活跃模块 = 全租户处于 active 状态的订阅数（panel 自身 PG，Local API 直读）
  const activeSubs = await payload.find({
    collection: 'subscriptions',
    where: { status: { equals: 'active' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const activeModules = activeSubs.totalDocs

  const tenants = (result.docs as Tenant[]).map((t) => ({
    id: t.id,
    tenant_id: t.tenant_id,
    company_name: t.company_name,
    plan: t.plan ?? 'standard',
    status: t.status ?? 'active',
    boss_user_ids: t.boss_user_ids ?? '',
    createdAt: t.createdAt ?? '',
  }))

  // Real counts from DB
  const totalCount = result.totalDocs
  const onlineCount = tenants.filter((t) => t.status === 'active').length

  return (
    <TenantsOverviewView
      tenants={tenants}
      totalCount={totalCount}
      onlineCount={onlineCount}
      activeModules={activeModules}
    />
  )
}
