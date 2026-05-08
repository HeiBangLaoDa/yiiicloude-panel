/**
 * Phase E.7 验收：建第二个 tenant + 两个 customer 用户，用于多租户隔离测试。
 *
 * 幂等：所有 upsert 按 unique key（tenant_id / email / (tenant,module) / (tenant,channel)）。
 *
 * 用法：pnpm tsx scripts/seed_customer_demo.ts
 *
 * 输出：账号信息打到 stdout，可直接登录 http://127.0.0.1:3001/login。
 */
import 'dotenv/config'
import crypto from 'crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const PASSWORD = 'demo123456'

async function upsertTenant(payload: any, tenantId: string, payloadFields: Record<string, any>) {
  const found = await payload.find({
    collection: 'tenants',
    where: { tenant_id: { equals: tenantId } },
    limit: 1,
  })
  if (found.docs[0]) {
    return await payload.update({
      collection: 'tenants',
      id: found.docs[0].id,
      data: payloadFields,
    })
  }
  return await payload.create({
    collection: 'tenants',
    data: { tenant_id: tenantId, ...payloadFields },
  })
}

async function upsertCustomerUser(
  payload: any,
  email: string,
  tenantPayloadId: number,
  displayName: string,
) {
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (found.docs[0]) {
    return await payload.update({
      collection: 'users',
      id: found.docs[0].id,
      data: { role: 'customer', tenant: tenantPayloadId, display_name: displayName },
    })
  }
  return await payload.create({
    collection: 'users',
    data: {
      email,
      password: PASSWORD,
      role: 'customer',
      tenant: tenantPayloadId,
      display_name: displayName,
    },
  })
}

async function upsertSubscription(
  payload: any,
  tenantId: number,
  moduleId: string,
  plan: string,
  quotaUsed = 1234,
  quotaMonthly = 10000,
) {
  const found = await payload.find({
    collection: 'subscriptions',
    where: {
      and: [{ tenant: { equals: tenantId } }, { module_id: { equals: moduleId } }],
    },
    limit: 1,
  })
  const data = {
    tenant: tenantId,
    module_id: moduleId,
    plan,
    status: 'active',
    quota_monthly: quotaMonthly,
    quota_used: quotaUsed,
    started_at: new Date().toISOString(),
  }
  if (found.docs[0]) {
    return await payload.update({ collection: 'subscriptions', id: found.docs[0].id, data })
  }
  return await payload.create({ collection: 'subscriptions', data })
}

async function upsertImBinding(payload: any, tenantId: number, channel: string, appKey: string) {
  const found = await payload.find({
    collection: 'im-bindings',
    where: {
      and: [{ tenant: { equals: tenantId } }, { channel: { equals: channel } }],
    },
    limit: 1,
  })
  const data = {
    tenant: tenantId,
    channel,
    app_key: appKey,
    app_secret_plain: 'demo-secret-' + appKey,
    corp_id: 'corp-' + tenantId,
    agent_id: 'agent-' + tenantId,
    status: 'active',
  }
  if (found.docs[0]) {
    return await payload.update({ collection: 'im-bindings', id: found.docs[0].id, data })
  }
  return await payload.create({ collection: 'im-bindings', data })
}

/** 给租户造一批散布在过去 N 天的调用记录，便于趋势图/分布图有内容 */
async function seedUsageRecords(payload: any, tenantId: number, configs: Array<{
  module_id: string
  channel: string
  daysAgo: number
  count: number
  tokens_in?: number
  tokens_out?: number
}>) {
  // 先清掉本租户旧记录，避免重复跑膨胀
  const existing = await payload.find({
    collection: 'usage-records',
    where: { tenant: { equals: tenantId } },
    limit: 1000,
  })
  for (const doc of existing.docs) {
    await payload.delete({ collection: 'usage-records', id: doc.id })
  }
  let total = 0
  for (const c of configs) {
    for (let i = 0; i < c.count; i++) {
      const d = new Date()
      d.setDate(d.getDate() - c.daysAgo)
      d.setHours(9 + (i % 10), (i * 7) % 60, (i * 13) % 60, 0)
      await payload.create({
        collection: 'usage-records',
        data: {
          tenant: tenantId,
          module_id: c.module_id,
          channel: c.channel,
          occurred_at: d.toISOString(),
          tokens_in: c.tokens_in ?? 200 + (i * 17) % 300,
          tokens_out: c.tokens_out ?? 500 + (i * 23) % 800,
          cost_cents: 0,
        },
      })
      total++
    }
  }
  return total
}

async function main() {
  const payload = await getPayload({ config })

  // 1. 获取/建立 tenant 1 — 复用 backfill 进来的第一条
  const existingTenants = await payload.find({ collection: 'tenants', limit: 1, sort: 'createdAt' })
  let tenant1: any
  if (existingTenants.docs[0]) {
    tenant1 = existingTenants.docs[0]
    console.log(`[tenant 1] 复用已有 tenant_id=${tenant1.tenant_id} (id=${tenant1.id})`)
  } else {
    tenant1 = await upsertTenant(payload, 'demo_alpha', {
      company_name: 'Alpha 演示客户',
      industry: 'tech',
      plan: 'standard',
      status: 'active',
    })
    console.log(`[tenant 1] 新建 tenant_id=${tenant1.tenant_id} (id=${tenant1.id})`)
  }

  // 2. 建 tenant 2
  const tenant2 = await upsertTenant(payload, 'demo_beta', {
    company_name: 'Beta 演示客户',
    industry: 'finance',
    plan: 'pro',
    status: 'active',
  })
  console.log(`[tenant 2] tenant_id=${tenant2.tenant_id} (id=${tenant2.id})`)

  // 3. subscriptions：tenant1 一个高用量(85%)+一个低用量；tenant2 一个超额(105%)
  await upsertSubscription(payload, tenant1.id, 'reports', 'standard', 8500, 10000)
  await upsertSubscription(payload, tenant1.id, 'ipguard', 'trial', 1234, 10000)
  await upsertSubscription(payload, tenant2.id, 'reports', 'pro', 10500, 10000)
  console.log('[subscriptions] 已创建/更新（含 1 高用量 + 1 超额，方便看预警）')

  // 4. 各建 1-2 条 im-binding
  await upsertImBinding(payload, tenant1.id, 'dingtalk', 'alpha-dingtalk-key')
  await upsertImBinding(payload, tenant1.id, 'feishu', 'alpha-feishu-key')
  await upsertImBinding(payload, tenant2.id, 'wecom', 'beta-wecom-key')
  console.log('[im-bindings] 已创建/更新')

  // 5. usage-records：散布在过去 7 天，让趋势图/分布图有内容
  const t1Count = await seedUsageRecords(payload, tenant1.id, [
    { module_id: 'reports', channel: 'dingtalk', daysAgo: 0, count: 12 },
    { module_id: 'reports', channel: 'dingtalk', daysAgo: 1, count: 8 },
    { module_id: 'reports', channel: 'feishu', daysAgo: 1, count: 3 },
    { module_id: 'ipguard', channel: 'dingtalk', daysAgo: 2, count: 6 },
    { module_id: 'reports', channel: 'dingtalk', daysAgo: 3, count: 9 },
    { module_id: 'ipguard', channel: 'feishu', daysAgo: 4, count: 4 },
    { module_id: 'reports', channel: 'dingtalk', daysAgo: 5, count: 11 },
    { module_id: 'reports', channel: 'feishu', daysAgo: 6, count: 5 },
  ])
  const t2Count = await seedUsageRecords(payload, tenant2.id, [
    { module_id: 'reports', channel: 'wecom', daysAgo: 0, count: 22 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 1, count: 18 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 2, count: 25 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 3, count: 14 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 4, count: 20 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 5, count: 16 },
    { module_id: 'reports', channel: 'wecom', daysAgo: 6, count: 8 },
  ])
  console.log(`[usage-records] tenant1 写入 ${t1Count} 条 / tenant2 写入 ${t2Count} 条`)

  // 6. 建两个 customer 用户
  const userA = await upsertCustomerUser(
    payload,
    'customer-a@yiiicloude.test',
    tenant1.id,
    'Alpha 演示客户 - 张三',
  )
  const userB = await upsertCustomerUser(
    payload,
    'customer-b@yiiicloude.test',
    tenant2.id,
    'Beta 演示客户 - 李四',
  )

  // 7. control-plane service-account：admin 角色 + API key（Phase D 用）
  const cpEmail = 'service-control-plane@yiiicloude.internal'
  const cpExisting = await payload.find({
    collection: 'users',
    where: { email: { equals: cpEmail } },
    limit: 1,
  })
  // 每次跑都生成新 key 写入；调用方需要拿这个明文存到 .env
  const plainKey = crypto.randomBytes(32).toString('hex')
  let cpUser: any
  if (cpExisting.docs[0]) {
    cpUser = await payload.update({
      collection: 'users',
      id: cpExisting.docs[0].id,
      data: { enableAPIKey: true, apiKey: plainKey },
    })
  } else {
    cpUser = await payload.create({
      collection: 'users',
      data: {
        email: cpEmail,
        password: PASSWORD,
        role: 'admin',
        display_name: 'control-plane (system)',
        enableAPIKey: true,
        apiKey: plainKey,
      },
    })
  }

  console.log('\n=== 演示账号 ===')
  console.log(`Tenant Alpha (id=${tenant1.id})`)
  console.log(`  email:    ${userA.email}`)
  console.log(`  password: ${PASSWORD}`)
  console.log()
  console.log(`Tenant Beta (id=${tenant2.id})`)
  console.log(`  email:    ${userB.email}`)
  console.log(`  password: ${PASSWORD}`)
  console.log('\n=== control-plane 服务账号（Phase D） ===')
  console.log(`  email:   ${cpUser.email}`)
  console.log(`  apiKey:  ${plainKey}`)
  console.log(`  用法:     header "Authorization: users API-Key <apiKey>"`)
  console.log(`  写入:     yiiicloude-control-plane/.env 里 PAYLOAD_API_KEY=${plainKey}`)
  console.log('\n登录入口: http://127.0.0.1:3001/login')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
