import { redirect } from 'next/navigation'

import { requireAdmin } from '@/lib/requireAdmin'

// Redirect /ops/tenants → /ops (overview shows tenant list)
export default async function TenantsIndexPage() {
  await requireAdmin()
  redirect('/ops')
}
