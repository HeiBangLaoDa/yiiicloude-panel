import { redirect } from 'next/navigation'
import React from 'react'

import { getCurrentUser } from '@/lib/server-auth'
import { AppShell } from './AppShell'

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'admin') redirect('/admin')
  if (user.tenant == null) redirect('/login?error=no_tenant')

  const tenant = typeof user.tenant === 'object' ? user.tenant : null

  return (
    <AppShell
      userEmail={user.email}
      displayName={user.display_name ?? user.email}
      tenantName={tenant?.company_name ?? null}
      role={user.role ?? 'customer'}
    >
      {children}
    </AppShell>
  )
}
