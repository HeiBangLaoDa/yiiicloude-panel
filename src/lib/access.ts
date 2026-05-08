/**
 * Multi-tenant access helpers.
 *
 * Payload 的 `relationship` 字段在请求里可能是已 populate 的 Tenant 对象，
 * 也可能仅是 ID（number）。下面的 helper 同时处理两种情况。
 *
 * 这里用宽类型 `any`，因为 payload-types.ts 在第一次生成前还不存在。
 * Phase B.4 跑过 `pnpm generate:types` 后可以改成强类型 import { User } from '../payload-types'。
 */

export type TenantId = number | string | null | undefined

interface UserLike {
  collection?: string
  role?: string
  tenant?: { id: number | string } | number | string | null
}

/**
 * MCP API key 也会作为 user 注入；用 collection 字段区分。
 * MCP key 视同 admin（颁发时已经在 admin 面板控制权限）。
 */
function isMcpApiKey(user: UserLike | null | undefined): boolean {
  return user?.collection === 'payload-mcp-api-keys'
}

export function getUserTenantId(user: UserLike | null | undefined): TenantId {
  if (!user || user.tenant == null) return null
  return typeof user.tenant === 'object' ? user.tenant.id : user.tenant
}

export function isAdmin(user: UserLike | null | undefined): boolean {
  if (!user) return false
  if (isMcpApiKey(user)) return true
  return user.role === 'admin'
}
