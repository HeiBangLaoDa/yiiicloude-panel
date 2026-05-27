'use client'

import Link from 'next/link'
import React from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TenantRow {
  id: number
  tenant_id: string
  company_name: string
  plan: string
  status: string
  boss_user_ids: string
  createdAt: string
}

interface Props {
  tenants: TenantRow[]
  totalCount: number
  onlineCount: number
  activeModules: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const planLabels: Record<string, string> = {
  trial: '试用',
  standard: '标准',
  pro: '专业',
}

/** Monogram colors per known tenant_id. Others fall back to info/slate. */
function tenantStyle(tenant_id: string): { bg: string; color: string } {
  switch (tenant_id) {
    case 'qinyin':
      return { bg: 'rgba(199, 242, 59, 0.12)', color: 'var(--accent)' }
    case 'ipguard-self-001':
      return { bg: 'rgba(244, 114, 182, 0.12)', color: '#F472B6' }
    case 'demo_beta':
      return { bg: 'rgba(148, 163, 184, 0.12)', color: 'var(--info)' }
    case 'tenant-dev-001':
      return { bg: 'rgba(251, 191, 36, 0.12)', color: 'var(--warn)' }
    case 'yiiicloude':
      return { bg: 'rgba(74, 222, 128, 0.12)', color: 'var(--ok)' }
    default:
      return { bg: 'rgba(148, 163, 184, 0.12)', color: 'var(--info)' }
  }
}

/** Fixed monograms per known tenant_id */
function tenantMonogram(tenant_id: string, company_name: string): string {
  const map: Record<string, string> = {
    qinyin: 'QY',
    'ipguard-self-001': 'TX',
    demo_beta: 'βE',
    'tenant-dev-001': 'DV',
    yiiicloude: 'YC',
  }
  return map[tenant_id] ?? company_name.slice(0, 2).toUpperCase()
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return '—'
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: '-0.015em',
          color: 'var(--text-1)',
        }}
      >
        {title}
      </h2>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
        }}
      >
        {meta}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TenantsOverviewView({ tenants, totalCount, onlineCount, activeModules }: Props) {
  return (
    <div style={{ padding: '32px 40px 64px', maxWidth: 1440 }}>
      {/* Page title */}
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 36,
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          color: 'var(--text-1)',
          marginBottom: 6,
        }}
      >
        总览
      </h1>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 36,
        }}
      >
        现在 · prod 122.51.156.91
      </div>

      {/* ──── KPI BAR ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--border-subtle)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 56,
        }}
      >
        {/* 租户在线 — real data */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            租户在线
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1,
              color: 'var(--text-1)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
            }}
          >
            {String(onlineCount).padStart(2, '0')}
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-3)',
                marginLeft: 4,
                fontWeight: 400,
                letterSpacing: 0,
              }}
            >
              / {String(totalCount).padStart(2, '0')}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            <span>—</span>
            <span>过去 7 天稳定</span>
          </div>
        </div>

        {/* 活跃模块 — 全租户 active 订阅数（Payload Local API 直读）*/}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            活跃模块
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1,
              color: 'var(--text-1)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
            }}
          >
            {String(activeModules).padStart(2, '0')}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              marginTop: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            <span>—</span>
            <span>正常订阅</span>
          </div>
        </div>

        {/* 本月 LLM TOKEN — 暂无数据源：usage-records 未被填充，待 one-api→panel ETL */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            本月 LLM TOKEN
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1,
              color: 'var(--text-3)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
            }}
          >
            —
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              marginTop: 14,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            暂无数据 · 待接入用量
          </div>
        </div>

        {/* 本月日报 — 暂无数据源：待 cp /v1/usage/daily + reports 只读 endpoint */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            本月日报
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1,
              color: 'var(--text-3)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
            }}
          >
            —
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              marginTop: 14,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
            }}
          >
            暂无数据 · 待接入 reports
          </div>
        </div>
      </div>

      {/* ──── TENANTS SECTION ──── */}
      <section style={{ marginBottom: 48 }}>
        <SectionHead
          title="租户"
          meta={`${totalCount} 个 · ${onlineCount} 在线`}
        />

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {tenants.map((t) => {
              const style = tenantStyle(t.tenant_id)
              const monogram = tenantMonogram(t.tenant_id, t.company_name)
              const bossCount = t.boss_user_ids
                ? t.boss_user_ids.split(',').filter(Boolean).length
                : 0
              const planLabel = planLabels[t.plan] ?? t.plan
              const isPro = t.plan === 'pro'

              return (
                <TenantRow
                  key={t.id}
                  id={t.id}
                  monogram={monogram}
                  monoStyle={style}
                  companyName={t.company_name}
                  tenantId={t.tenant_id}
                  createdAt={formatDate(t.createdAt)}
                  planLabel={planLabel}
                  isPro={isPro}
                  isActive={t.status === 'active'}
                  bossCount={bossCount}
                />
              )
            })}
          </tbody>
        </table>
      </section>

    </div>
  )
}

// ─── Tenant table row (stateful hover) ───────────────────────────────────────

interface TenantRowProps {
  id: number
  monogram: string
  monoStyle: { bg: string; color: string }
  companyName: string
  tenantId: string
  createdAt: string
  planLabel: string
  isPro: boolean
  isActive: boolean
  bossCount: number
}

function TenantRow({
  id,
  monogram,
  monoStyle,
  companyName,
  tenantId,
  createdAt,
  planLabel,
  isPro,
  isActive,
  bossCount,
}: TenantRowProps) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: hovered ? 'var(--surface-1)' : 'transparent',
        transition: 'background 120ms ease',
      }}
    >
      {/* Hover stripe */}
      <td style={{ width: 6, padding: 0 }}>
        <div
          style={{
            width: 2,
            height: 36,
            background: hovered ? 'var(--accent)' : 'transparent',
            transition: 'background 120ms ease',
          }}
        />
      </td>

      {/* Monogram avatar */}
      <td style={{ width: 54, padding: '16px 8px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.04em',
            background: monoStyle.bg,
            color: monoStyle.color,
          }}
        >
          {monogram}
        </div>
      </td>

      {/* Company name + id + created */}
      <td style={{ padding: '16px 8px' }}>
        <div
          style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', marginBottom: 3 }}
        >
          {companyName}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-3)',
            letterSpacing: '0.02em',
          }}
        >
          {tenantId} · 创建 {createdAt}
        </div>
      </td>

      {/* Tier badge */}
      <td style={{ width: 90, padding: '16px 8px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 3,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            border: '1px solid',
            whiteSpace: 'nowrap',
            color: isPro ? 'var(--accent)' : 'var(--text-2)',
            borderColor: isPro ? 'var(--accent)' : 'var(--border-strong)',
            background: isPro ? 'var(--accent-dim)' : 'transparent',
          }}
        >
          {planLabel}
        </span>
      </td>

      {/* Status pill */}
      <td style={{ width: 80, padding: '16px 8px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-2)',
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isActive ? 'var(--ok)' : 'var(--danger)',
              display: 'inline-block',
            }}
          />
          {isActive ? '正常' : '已暂停'}
        </span>
      </td>

      {/* Employee count — Phase 1 uses data from tenants table (no real join here, shown as —) */}
      <td style={{ width: 96, padding: '16px 8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          — 员工
        </span>
      </td>

      {/* Boss count — derived from boss_user_ids */}
      <td style={{ width: 96, padding: '16px 8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: bossCount > 0 ? 'var(--text-2)' : 'var(--text-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {bossCount > 0 ? `${bossCount} 老板` : '— 老板'}
        </span>
      </td>

      {/* Module count — Phase 1 hardcode */}
      <td style={{ width: 96, padding: '16px 8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--text-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          — 模块
        </span>
      </td>

      {/* Detail link */}
      <td style={{ textAlign: 'right', width: 80, padding: '16px 8px' }}>
        <Link
          href={`/ops/tenants/${id}`}
          style={{
            color: hovered ? 'var(--accent)' : 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'color 120ms ease',
          }}
        >
          详情 →
        </Link>
      </td>
    </tr>
  )
}
