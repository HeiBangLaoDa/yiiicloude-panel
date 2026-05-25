import { redirect } from 'next/navigation'

// Redirect /ops/tenants → /ops (overview shows tenant list)
export default function TenantsIndexPage() {
  redirect('/ops')
}
