import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { isAdmin } from '@/lib/access'

/**
 * 服务端管理员校验（ops 页面专用）。
 *
 * Next.js 布局在客户端导航时可能不重新执行，页面自身必须独立校验，
 * 且必须在任何 overrideAccess:true 的查询之前调用。
 * 判定与 (ops)/ops/layout.tsx 一致：未登录 → 登录页；非 admin → customer 回 /dashboard，其余回登录页。
 */
export async function requireAdmin() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/admin/login?redirect=/ops')
  }
  if (!isAdmin(user as any)) {
    redirect((user as any).role === 'customer' ? '/dashboard' : '/admin/login')
  }
  return user
}
