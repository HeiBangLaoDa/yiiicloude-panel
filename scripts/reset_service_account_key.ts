/**
 * 单独重置 service-control-plane service-account API key
 * 适用：本机 dev 环境从 prod restore 后 PAYLOAD_SECRET 不一致导致 prod apiKey 失效，
 *      又不想跑完整 seed_customer_demo.ts（避免触发 demo data 副作用 + ipguard enum 限制）。
 *
 * 用法：pnpm tsx scripts/reset_service_account_key.ts
 * 输出：新 plainKey 到 stdout，调用方需要拿来注入下游 service .env
 */
import 'dotenv/config'
import crypto from 'crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const SERVICE_EMAIL = 'service-control-plane@yiiicloude.internal'

async function main() {
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: SERVICE_EMAIL } },
    limit: 1,
  })
  if (!found.docs[0]) {
    throw new Error(`user ${SERVICE_EMAIL} not found — restore prod data first`)
  }
  const plainKey = crypto.randomBytes(32).toString('hex')
  const updated = await payload.update({
    collection: 'users',
    id: found.docs[0].id,
    data: { enableAPIKey: true, apiKey: plainKey },
  })
  console.log(`\n=== service-account API key reset ===`)
  console.log(`  email:   ${updated.email}`)
  console.log(`  apiKey:  ${plainKey}`)
  console.log(`  用法:    header "Authorization: users API-Key <apiKey>"`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
