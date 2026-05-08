import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

type Op = 'create' | 'update' | 'delete'
type Summarizer = (doc: any, op: Op, previousDoc?: any) => string

interface AuditOpts {
  /** 关联到哪个 tenant：函数读 doc 提取 tenant id；不传时按 collection slug 'tenants' 取 doc.id */
  getTenantId?: (doc: any) => number | string | null | undefined
  /** 客户面"摘要"行 */
  summarize: Summarizer
}

function defaultGetTenantId(slug: string, doc: any) {
  if (slug === 'tenants') return doc.id
  if (typeof doc.tenant === 'object' && doc.tenant) return doc.tenant.id
  return doc.tenant ?? null
}

function actorOf(req: any): string {
  if (req.user?.collection === 'payload-mcp-api-keys') {
    return `mcp:${req.user.name ?? req.user.id ?? 'unknown'}`
  }
  return req.user?.email ?? 'system'
}

export function auditAfterChange(opts: AuditOpts): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, operation, req, collection }) => {
    if (operation !== 'create' && operation !== 'update') return doc
    const tenantId =
      opts.getTenantId?.(doc) ?? defaultGetTenantId(collection.slug, doc)
    if (tenantId == null) return doc
    try {
      await req.payload.create({
        collection: 'audit-log',
        data: {
          tenant: tenantId,
          actor: actorOf(req),
          action: `${collection.slug}.${operation}`,
          target: `${collection.slug}/${doc.id}`,
          summary: opts.summarize(doc, operation as Op, previousDoc),
        },
      })
    } catch (e) {
      req.payload.logger.error({ err: e }, '[audit] afterChange write failed')
    }
    return doc
  }
}

export function auditAfterDelete(opts: AuditOpts): CollectionAfterDeleteHook {
  return async ({ doc, req, collection }) => {
    const tenantId =
      opts.getTenantId?.(doc) ?? defaultGetTenantId(collection.slug, doc)
    if (tenantId == null) return
    try {
      await req.payload.create({
        collection: 'audit-log',
        data: {
          tenant: tenantId,
          actor: actorOf(req),
          action: `${collection.slug}.delete`,
          target: `${collection.slug}/${doc.id}`,
          summary: opts.summarize(doc, 'delete'),
        },
      })
    } catch (e) {
      req.payload.logger.error({ err: e }, '[audit] afterDelete write failed')
    }
  }
}
