import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Server-side：基于 cookie 取当前登录用户。无登录返回 null。
 * 客户面登录后 Payload 写 payload-token cookie，这里走 payload.auth 解析。
 */
export async function getCurrentUser(): Promise<User | null> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers })
  if (!user) return null
  if ((user as { collection?: string }).collection !== 'users') return null
  return user as User
}
