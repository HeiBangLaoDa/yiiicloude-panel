import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { isAdmin } from '@/lib/access'
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

  // ops 页面内部多处 overrideAccess:true 全租户查询，布局层必须限定 admin
  // （isAdmin = role==='admin' 或 MCP API key，与 collections 的 access 判定一致）
  if (!isAdmin(user as any)) {
    redirect((user as any).role === 'customer' ? '/dashboard' : '/admin/login')
  }

  return <OpsShell>{children}</OpsShell>
}
