import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { getCurrentUser } from '@/lib/server-auth'
import type { AuditLog } from '@/payload-types'
import { ActivityView } from './ActivityView'

export default async function ActivityPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'audit-log',
    user,
    overrideAccess: false,
    limit: 200,
    sort: '-createdAt',
  })

  return <ActivityView items={result.docs as AuditLog[]} />
}
