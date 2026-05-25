import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import config from '@/payload.config'
import type { Employee, ImBinding, Subscription, Tenant } from '@/payload-types'
import { TenantDetailView } from './TenantDetailView'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params
  const tenantId = parseInt(id, 10)
  if (isNaN(tenantId)) notFound()

  const payload = await getPayload({ config: await config })

  const [tenantResult, employeesResult, imBindingsResult, subscriptionsResult] =
    await Promise.all([
      payload.findByID({
        collection: 'tenants',
        id: tenantId,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'employees',
        where: { tenant: { equals: tenantId } },
        limit: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'im-bindings',
        where: { tenant: { equals: tenantId } },
        limit: 10,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'subscriptions',
        where: { tenant: { equals: tenantId } },
        limit: 10,
        overrideAccess: true,
      }),
    ])

  if (!tenantResult) notFound()

  const tenant = tenantResult as Tenant

  // ── boss_user_ids JOIN employees ──────────────────────────────────────────
  // boss_user_ids is a comma-separated string of raw dingtalk userIds (staff_id format).
  // We JOIN employees to resolve real names. This is the Phase 1 fix for the functional gap.
  const bossIds = (tenant.boss_user_ids ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)

  const bossesResult =
    bossIds.length > 0
      ? await payload.find({
          collection: 'employees',
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { staff_id: { in: bossIds } },
            ],
          },
          limit: 50,
          overrideAccess: true,
        })
      : { docs: [] }

  const bossMap = new Map(
    (bossesResult.docs as Employee[]).map((e) => [e.staff_id, e]),
  )

  // Build boss display data — preserve order from boss_user_ids
  const bosses = bossIds.map((sid) => {
    const emp = bossMap.get(sid)
    return {
      staff_id: sid,
      name: emp?.name ?? `未知`,
      role: emp?.role ?? 'boss',
      department: emp?.department ?? '',
      position: emp?.position ?? '',
      found: Boolean(emp),
    }
  })

  const imBindings = (imBindingsResult.docs as ImBinding[]).map((b) => ({
    id: b.id,
    channel: b.channel,
    app_key: b.app_key ?? '',
    status: b.status,
    has_app_secret: Boolean(b.app_secret_enc),
    createdAt: b.createdAt ?? '',
  }))

  const subscriptions = (subscriptionsResult.docs as Subscription[]).map((s) => ({
    id: s.id,
    module_id: s.module_id,
    plan: s.plan,
    status: s.status,
    quota_monthly: s.quota_monthly ?? 0,
    quota_used: s.quota_used ?? 0,
    expires_at: s.expires_at ?? null,
  }))

  return (
    <TenantDetailView
      tenant={{
        id: tenant.id,
        tenant_id: tenant.tenant_id,
        company_name: tenant.company_name,
        industry: tenant.industry ?? 'general',
        plan: tenant.plan ?? 'standard',
        status: tenant.status ?? 'active',
        monthly_quota: tenant.monthly_quota ?? 1000,
        createdAt: tenant.createdAt ?? '',
        updatedAt: tenant.updatedAt ?? '',
      }}
      employeesCount={employeesResult.totalDocs}
      bosses={bosses}
      imBindings={imBindings}
      subscriptions={subscriptions}
    />
  )
}
