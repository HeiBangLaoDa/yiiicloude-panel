import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { OpsShell } from './OpsShell'

export const metadata = {
  title: '运维后台 — Yiiicloude',
  description: 'Yiiicloude SaaS 运维管理后台',
}

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login?redirect=/ops')
  }

  return <OpsShell>{children}</OpsShell>
}
