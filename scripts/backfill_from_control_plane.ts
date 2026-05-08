/**
 * Phase C: 从 control-plane Postgres 把现有业务数据搬到 Payload。
 *
 * 源：yiiicloude DB（54324）的 5 张表
 *   tenant / tenant_module_subscription / im_channel_binding / module_routing_rule / usage_record
 * 目标：yiiicloude_panel DB（同实例）的 6 个 collection
 *
 * 幂等：tenant_id / (tenant,channel) / (tenant,module_id) 等唯一约束做 upsert；
 * 重跑不会重复创建。
 *
 * 用法：pnpm tsx scripts/backfill_from_control_plane.ts
 *
 * 注意：im_binding 的 _enc 字段直接拷贝密文（保密钥兼容），不做加解密。
 */
import 'dotenv/config'
import { Client } from 'pg'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const SOURCE_DB = {
  host: '127.0.0.1',
  port: 54324,
  database: 'yiiicloude',
  user: 'yiiicloude',
  password: 'yiiicloude',
}

async function main() {
  const payload = await getPayload({ config })
  const src = new Client(SOURCE_DB)
  await src.connect()

  // ---------- 1. tenants ----------
  const { rows: tenantRows } = await src.query(`
    SELECT tenant_id, company_name, industry, plan, status, boss_user_ids, monthly_quota,
           created_at, updated_at
    FROM tenant
  `)
  const tenantIdToPayloadId = new Map<string, number>()  // 源 tenant_id → Payload 自增 id
  for (const r of tenantRows) {
    const found = await payload.find({
      collection: 'tenants',
      where: { tenant_id: { equals: r.tenant_id } },
      limit: 1,
    })
    let docId: number
    if (found.docs.length > 0) {
      docId = found.docs[0].id as number
      console.log(`  [tenants] 跳过已存在: ${r.tenant_id} (id=${docId})`)
    } else {
      const created = await payload.create({
        collection: 'tenants',
        data: {
          tenant_id: r.tenant_id,
          company_name: r.company_name,
          industry: r.industry || 'general',
          plan: r.plan || 'standard',
          status: r.status || 'active',
          boss_user_ids: r.boss_user_ids || undefined,
          monthly_quota: r.monthly_quota ?? 1000,
        },
      })
      docId = created.id as number
      console.log(`  [tenants] ✓ ${r.tenant_id} → id=${docId}`)
    }
    tenantIdToPayloadId.set(r.tenant_id, docId)
  }
  console.log(`✓ tenants: ${tenantRows.length} 条\n`)

  // ---------- 2. subscriptions ----------
  const { rows: subRows } = await src.query(`
    SELECT tenant_id, module_id, plan, status, started_at, expires_at,
           quota_monthly, quota_used, config
    FROM tenant_module_subscription
  `)
  let subOk = 0
  for (const r of subRows) {
    const tenantPayloadId = tenantIdToPayloadId.get(r.tenant_id)
    if (!tenantPayloadId) {
      console.warn(`  [subs] ⚠ 未找到 tenant=${r.tenant_id}，跳过`)
      continue
    }
    const found = await payload.find({
      collection: 'subscriptions',
      where: {
        tenant: { equals: tenantPayloadId },
        module_id: { equals: r.module_id },
      },
      limit: 1,
    })
    if (found.docs.length > 0) {
      console.log(`  [subs] 跳过已存在: ${r.tenant_id}/${r.module_id}`)
    } else {
      await payload.create({
        collection: 'subscriptions',
        data: {
          tenant: tenantPayloadId,
          module_id: r.module_id,
          plan: r.plan || 'trial',
          status: r.status || 'active',
          started_at: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
          expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : undefined,
          quota_monthly: r.quota_monthly ?? 1000,
          quota_used: r.quota_used ?? 0,
          config: r.config ?? {},
        },
      })
      subOk++
    }
  }
  console.log(`✓ subscriptions: 新增 ${subOk}/${subRows.length}\n`)

  // ---------- 3. im_bindings ----------
  const { rows: imRows } = await src.query(`
    SELECT tenant_id, channel, app_key, app_secret_enc, corp_id, agent_id,
           callback_token, aes_key_enc, status
    FROM im_channel_binding
  `)
  let imOk = 0
  for (const r of imRows) {
    const tenantPayloadId = tenantIdToPayloadId.get(r.tenant_id)
    if (!tenantPayloadId) continue
    const found = await payload.find({
      collection: 'im-bindings',
      where: {
        tenant: { equals: tenantPayloadId },
        channel: { equals: r.channel },
      },
      limit: 1,
    })
    if (found.docs.length > 0) {
      console.log(`  [im] 跳过已存在: ${r.tenant_id}/${r.channel}`)
    } else {
      // 直接拷密文（_enc 字段），避免触发 beforeChange hook 的明文加密路径
      await payload.create({
        collection: 'im-bindings',
        data: {
          tenant: tenantPayloadId,
          channel: r.channel,
          app_key: r.app_key || undefined,
          app_secret_enc: r.app_secret_enc || undefined,
          corp_id: r.corp_id || undefined,
          agent_id: r.agent_id || undefined,
          callback_token: r.callback_token || undefined,
          aes_key_enc: r.aes_key_enc || undefined,
          status: r.status || 'active',
        },
      })
      imOk++
    }
  }
  console.log(`✓ im-bindings: 新增 ${imOk}/${imRows.length}\n`)

  // ---------- 4. routing_rules ----------
  const { rows: rrRows } = await src.query(`
    SELECT tenant_id, channel, match_type, pattern, target_module_id, priority, enabled
    FROM module_routing_rule
  `)
  let rrOk = 0
  for (const r of rrRows) {
    const tenantPayloadId = tenantIdToPayloadId.get(r.tenant_id)
    if (!tenantPayloadId) continue
    // 用 (tenant + channel + match_type + pattern) 去重判断
    const found = await payload.find({
      collection: 'routing-rules',
      where: {
        and: [
          { tenant: { equals: tenantPayloadId } },
          { channel: { equals: r.channel } },
          { match_type: { equals: r.match_type } },
          { pattern: { equals: r.pattern || '' } },
        ],
      },
      limit: 1,
    })
    if (found.docs.length > 0) {
      console.log(`  [rules] 跳过已存在: ${r.tenant_id}/${r.channel}/${r.match_type}`)
    } else {
      await payload.create({
        collection: 'routing-rules',
        data: {
          tenant: tenantPayloadId,
          channel: r.channel,
          match_type: r.match_type,
          pattern: r.pattern || undefined,
          target_module_id: r.target_module_id,
          priority: r.priority ?? 100,
          enabled: r.enabled ?? true,
        },
      })
      rrOk++
    }
  }
  console.log(`✓ routing-rules: 新增 ${rrOk}/${rrRows.length}\n`)

  // ---------- 5. usage_records (最近 90 天) ----------
  const { rows: urRows } = await src.query(`
    SELECT tenant_id, module_id, channel, occurred_at, tokens_in, tokens_out, cost_cents
    FROM usage_record
    WHERE occurred_at >= NOW() - INTERVAL '90 days'
    ORDER BY occurred_at
  `)
  let urOk = 0
  for (const r of urRows) {
    const tenantPayloadId = tenantIdToPayloadId.get(r.tenant_id)
    if (!tenantPayloadId) continue
    // 用量记录可能很多；用 (tenant, module, occurred_at, tokens_in) 做粗去重
    const found = await payload.find({
      collection: 'usage-records',
      where: {
        and: [
          { tenant: { equals: tenantPayloadId } },
          { module_id: { equals: r.module_id } },
          { occurred_at: { equals: new Date(r.occurred_at).toISOString() } },
          { tokens_in: { equals: r.tokens_in } },
        ],
      },
      limit: 1,
    })
    if (found.docs.length === 0) {
      await payload.create({
        collection: 'usage-records',
        data: {
          tenant: tenantPayloadId,
          module_id: r.module_id,
          channel: r.channel || undefined,
          occurred_at: new Date(r.occurred_at).toISOString(),
          tokens_in: r.tokens_in,
          tokens_out: r.tokens_out,
          cost_cents: r.cost_cents,
        },
      })
      urOk++
    }
  }
  console.log(`✓ usage-records: 新增 ${urOk}/${urRows.length}（最近 90 天）\n`)

  await src.end()
  console.log('=== Backfill 完成 ===')
  console.log(`tenants ${tenantRows.length} | subs ${subRows.length} | im ${imRows.length} | rules ${rrRows.length} | usage ${urRows.length}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
