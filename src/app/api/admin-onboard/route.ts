import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'

import configPromise from '@/payload.config'
import { isAdmin } from '@/lib/access'

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

interface ModuleInput {
  module_id: string
  plan: string
  quota_monthly: number
}

interface ImBindingInput {
  platform: string
  client_id: string
  app_secret_plain: string
  agent_id: string
  aes_key_plain?: string
}

interface KBInput {
  role: string
  persona: string
  visible_fields: string
  red_lines: string
}

interface OnboardBody {
  tenant: {
    tenant_id: string
    company_name: string
    industry?: string
    plan?: string
    boss_user_ids?: string
    monthly_quota?: number
  }
  modules: ModuleInput[]
  im_binding: ImBindingInput
  tenant_role_kb?: KBInput[]
}

// ──────────────────────────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth — verify admin via Payload
  const headersList = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headersList })

  if (!isAdmin(user)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Parse body + validate required fields
  let body: OnboardBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { tenant, modules, im_binding, tenant_role_kb } = body

  if (!tenant?.tenant_id || !tenant?.company_name) {
    return NextResponse.json(
      { error: 'missing_required_fields', fields: ['tenant.tenant_id', 'tenant.company_name'] },
      { status: 400 },
    )
  }
  if (!im_binding?.client_id || !im_binding?.app_secret_plain || !im_binding?.agent_id) {
    return NextResponse.json(
      {
        error: 'missing_required_fields',
        fields: ['im_binding.client_id', 'im_binding.app_secret_plain', 'im_binding.agent_id'],
      },
      { status: 400 },
    )
  }
  if (!modules || modules.length === 0) {
    return NextResponse.json({ error: 'missing_required_fields', fields: ['modules'] }, { status: 400 })
  }

  // 3. Check tenant_id uniqueness
  const existing = await payload.find({
    collection: 'tenants',
    where: { tenant_id: { equals: tenant.tenant_id } },
    limit: 1,
    overrideAccess: false,
    user,
  })

  if (existing.totalDocs > 0) {
    return NextResponse.json(
      { error: 'tenant_already_exists', tenant_id: tenant.tenant_id },
      { status: 409 },
    )
  }

  // tracking for partial-success response
  let tenantPid: number | undefined
  const createdSubscriptionIds: number[] = []

  // 4. Create Tenant
  let tenantDoc: { id: number }
  try {
    tenantDoc = (await payload.create({
      collection: 'tenants',
      data: {
        tenant_id: tenant.tenant_id,
        company_name: tenant.company_name,
        industry: (tenant.industry as 'tech' | 'finance' | 'manufacturing' | 'retail' | 'education' | 'general') || 'general',
        plan: (tenant.plan as 'trial' | 'standard' | 'pro') || 'standard',
        status: 'active',
        boss_user_ids: tenant.boss_user_ids ?? '',
        monthly_quota: tenant.monthly_quota ?? 50000,
      },
      overrideAccess: false,
      user,
    })) as { id: number }
    tenantPid = tenantDoc.id
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, stage: 'tenant_create', errors: [msg] },
      { status: 500 },
    )
  }

  // 5. Create Subscriptions
  for (const mod of modules) {
    try {
      const sub = (await payload.create({
        collection: 'subscriptions',
        data: {
          tenant: tenantPid,
          module_id: mod.module_id as 'yguard' | 'reports',
          plan: (mod.plan as 'trial' | 'standard' | 'pro') || 'standard',
          status: 'active',
          quota_monthly: mod.quota_monthly ?? 1000,
          quota_used: 0,
          started_at: new Date().toISOString(),
        },
        overrideAccess: false,
        user,
      })) as { id: number }
      createdSubscriptionIds.push(sub.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        {
          success: false,
          stage: `subscription_create[${mod.module_id}]`,
          tenant_id: tenant.tenant_id,
          tenant_pid: tenantPid,
          created_subscription_ids: createdSubscriptionIds,
          errors: [msg],
        },
        { status: 500 },
      )
    }
  }

  // 6. Create ImBinding
  try {
    await payload.create({
      collection: 'im-bindings',
      data: {
        tenant: tenantPid,
        channel: (im_binding.platform as 'dingtalk' | 'wecom' | 'feishu') || 'dingtalk',
        app_key: im_binding.client_id,
        app_secret_plain: im_binding.app_secret_plain,
        aes_key_plain: im_binding.aes_key_plain ?? '',
        agent_id: im_binding.agent_id,
        status: 'active',
      },
      overrideAccess: false,
      user,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        success: false,
        stage: 'im_binding_create',
        tenant_id: tenant.tenant_id,
        tenant_pid: tenantPid,
        created_subscription_ids: createdSubscriptionIds,
        errors: [msg],
      },
      { status: 500 },
    )
  }

  // 7. Create TenantRoleKB (if provided)
  if (tenant_role_kb && tenant_role_kb.length > 0) {
    for (const kb of tenant_role_kb) {
      try {
        const vfList = kb.visible_fields
          ? kb.visible_fields.split('/').map((f) => ({ field: f.trim() })).filter((f) => f.field)
          : []
        const rlList = kb.red_lines
          ? kb.red_lines.split(';').map((r) => ({ rule: r.trim() })).filter((r) => r.rule)
          : []

        await payload.create({
          collection: 'tenant-role-kb',
          data: {
            tenant: tenantPid,
            role: kb.role as 'boss' | 'dept_head' | 'boss_assistant' | 'hr_manager' | 'it_admin' | 'employee' | 'default',
            soul_template: kb.persona,
            visible_fields: vfList,
            red_lines: rlList,
            is_active: true,
          },
          overrideAccess: false,
          user,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json(
          {
            success: false,
            stage: `tenant_role_kb_create[${kb.role}]`,
            tenant_id: tenant.tenant_id,
            tenant_pid: tenantPid,
            created_subscription_ids: createdSubscriptionIds,
            errors: [msg],
          },
          { status: 500 },
        )
      }
    }
  }

  // 8. Call control-plane provision
  const cpBase =
    process.env.CONTROL_PLANE_BASE_URL ?? 'http://127.0.0.1:8070'
  const cpSecret = process.env.CONTROL_PLANE_ADMIN_SECRET ?? ''

  let provisionModules: string[] = modules.map((m) => m.module_id)
  let skillsLinked: string[] = []
  let started = false
  const provisionErrors: string[] = []

  try {
    const provResp = await fetch(`${cpBase}/v1/profiles/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': cpSecret,
      },
      body: JSON.stringify({ tenant_id: tenant.tenant_id }),
    })

    if (provResp.ok) {
      const provData = (await provResp.json()) as {
        profile?: { modules?: string[]; skills_linked?: string[]; started?: boolean }
        errors?: string[]
      }
      const profile = provData.profile ?? {}
      provisionModules = profile.modules ?? provisionModules
      skillsLinked = profile.skills_linked ?? []
      started = profile.started ?? false
      if (provData.errors) {
        provisionErrors.push(...provData.errors)
      }
    } else {
      const text = await provResp.text()
      provisionErrors.push(`provision HTTP ${provResp.status}: ${text.slice(0, 400)}`)
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    provisionErrors.push(`provision network error: ${msg}`)
  }

  // 9. Return success (provision errors are non-fatal warnings)
  return NextResponse.json({
    success: true,
    tenant_id: tenant.tenant_id,
    tenant_pid: tenantPid,
    modules: provisionModules,
    skills_linked: skillsLinked,
    started,
    errors: provisionErrors,
  })
}
