import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { getCurrentUser } from '@/lib/server-auth'
import type { Subscription } from '@/payload-types'
import { SubscriptionsView } from './SubscriptionsView'

export default async function SubscriptionsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'subscriptions',
    user,
    overrideAccess: false,
    limit: 100,
    sort: 'module_id',
  })

  return <SubscriptionsView items={result.docs as Subscription[]} />
}
