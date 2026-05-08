import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { getCurrentUser } from '@/lib/server-auth'
import type { ImBinding } from '@/payload-types'
import { ImConfigView } from './ImConfigView'

export default async function ImConfigPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const payload = await getPayload({ config: await config })
  const result = await payload.find({
    collection: 'im-bindings',
    user,
    overrideAccess: false,
    limit: 100,
    sort: 'channel',
  })

  return <ImConfigView items={result.docs as ImBinding[]} />
}
