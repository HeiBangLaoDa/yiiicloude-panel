'use client'

import Link from 'next/link'
import React from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BossInfo {
  staff_id: string
  name: string
  role: string
  department: string
  position: string
  found: boolean
}

interface ImBindingRow {
  id: number
  channel: string
  app_key: string
  status: string
  has_app_secret: boolean
  createdAt: string
}

interface SubscriptionRow {
  id: number
  module_id: string
  plan: string
  status: string
  quota_monthly: number
  quota_used: number
  expires_at: string | null
}

interface TenantInfo {
  id: number
  tenant_id: string
  company_name: string
  industry: string
  plan: string
  status: string
  monthly_quota: number
  createdAt: string
  updatedAt: string
}

interface Props {
  tenant: TenantInfo
  employeesCount: number
  bosses: BossInfo[]
  imBindings: ImBindingRow[]
  subscriptions: SubscriptionRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const planLabels: Record<string, string> = {
  trial: '试用',
  standard: '标准',
  pro: '专业',
}

const industryLabels: Record<string, string> = {
  tech: '科技',
  finance: '金融',
  manufacturing: '制造',
  retail: '零售',
  education: '教育',
  general: '通用',
}

const channelLabels: Record<string, string> = {
  dingtalk: '钉钉',
  wecom: '企业微信',
  feishu: '飞书',
}

const moduleLabels: Record<string, string> = {
  yguard: '数据安全',
  reports: '智能报表',
}

/** Boss avatar color classes cycle (4 colors from mockup) */
const BOSS_COLORS = [
  { bg: 'rgba(199, 242, 59, 0.15)', color: 'var(--accent)' },   // a-li1
  { bg: 'rgba(244, 114, 182, 0.15)', color: '#F472B6' },          // a-ren
  { bg: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' },           // a-li2
  { bg: 'rgba(251, 191, 36, 0.15)', color: 'var(--warn)' },      // a-zhang
]

function formatTs(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${mo}-${day} ${h}:${mi}:${s}`
  } catch {
    return '—'
  }
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

/** Extract the first Chinese character (姓) from a name */
function firstChar(name: string): string {
  // For "未知" or non-Chinese names, just take first char
  return name.charAt(0)
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
        marginBottom: 24,
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

export function TenantDetailView({
  tenant,
  employeesCount,
  bosses,
  imBindings,
  subscriptions,
}: Props) {
  const isPro = tenant.plan === 'pro'
  const isActive = tenant.status === 'active'

  return (
    <div style={{ padding: '24px 40px 80px', maxWidth: 1440 }}>

      {/* ──── BREADCRUMB ──── */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          marginBottom: 24,
        }}
      >
        <Link
          href="/ops"
          style={{ color: 'var(--text-2)', transition: 'color 120ms ease' }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--accent)')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-2)')}
        >
          总览
        </Link>
        <span style={{ color: 'var(--text-disabled)', padding: '0 8px' }}>/</span>
        <Link
          href="/ops/tenants"
          style={{ color: 'var(--text-2)', transition: 'color 120ms ease' }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--accent)')}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--text-2)')}
        >
          租户
        </Link>
        <span style={{ color: 'var(--text-disabled)', padding: '0 8px' }}>/</span>
        <span style={{ color: 'var(--text-1)' }}>
          {tenant.company_name.slice(0, 4)}
        </span>
      </div>

      {/* ──── HERO ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '72px 1fr auto',
          gap: 20,
          alignItems: 'center',
          paddingBottom: 28,
          marginBottom: 36,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Monogram */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: '0.04em',
            background: 'rgba(199, 242, 59, 0.12)',
            color: 'var(--accent)',
          }}
        >
          {tenant.tenant_id === 'qinyin'
            ? 'QY'
            : tenant.tenant_id === 'ipguard-self-001'
              ? 'TX'
              : tenant.tenant_id === 'demo_beta'
                ? 'βE'
                : tenant.tenant_id === 'tenant-dev-001'
                  ? 'DV'
                  : tenant.tenant_id === 'yiiicloude'
                    ? 'YC'
                    : tenant.company_name.slice(0, 2).toUpperCase()}
        </div>

        {/* Title + meta row */}
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              fontSize: 32,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--text-1)',
              marginBottom: 10,
            }}
          >
            {tenant.company_name}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
            }}
          >
            <span>{tenant.tenant_id}</span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            {/* Tier badge */}
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
              {planLabels[tenant.plan] ?? tenant.plan}
            </span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            {/* Status pill */}
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
              {isActive ? '运营中' : '已暂停'}
            </span>
            <span style={{ color: 'var(--text-disabled)' }}>·</span>
            <span style={{ color: 'var(--text-3)' }}>
              创建 {formatDate(tenant.createdAt)} · 更新 {formatTs(tenant.updatedAt).slice(11, 19)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`/admin/collections/tenants/${tenant.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-2)',
              transition: 'all 120ms ease',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            → Payload 编辑
          </a>
          <button
            onClick={() => {
              // TODO Phase 2: connect cp /v1/contacts/sync/{tenant_id}
              console.log('[ops] sync dingtalk clicked for tenant:', tenant.tenant_id)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              background: 'var(--accent-dim)',
              transition: 'all 120ms ease',
              cursor: 'pointer',
            }}
          >
            同步钉钉
          </button>
        </div>
      </div>

      {/* ──── KPI BAR ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--border-subtle)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 48,
        }}
      >
        {/* 在册员工 */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div style={kpiLabelStyle}>在册员工</div>
          <div style={kpiValueStyle}>
            {String(employeesCount).padStart(2, '0')}
          </div>
          <div style={{ ...kpiDeltaStyle, color: 'var(--text-3)' }}>
            <span>人</span>
            <span>钉钉同步</span>
          </div>
        </div>

        {/* IM 渠道 */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div style={kpiLabelStyle}>IM 渠道</div>
          <div style={kpiValueStyle}>
            {String(imBindings.length).padStart(2, '0')}
          </div>
          <div style={{ ...kpiDeltaStyle, color: 'var(--text-3)' }}>
            <span>{imBindings[0] ? channelLabels[imBindings[0].channel] ?? imBindings[0].channel : '未配置'}</span>
            <span>{imBindings[0]?.has_app_secret ? '已配密钥' : '未配密钥'}</span>
          </div>
        </div>

        {/* 订阅模块 */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div style={kpiLabelStyle}>订阅模块</div>
          <div style={kpiValueStyle}>
            {String(subscriptions.length).padStart(2, '0')}
          </div>
          <div style={{ ...kpiDeltaStyle, color: 'var(--text-3)' }}>
            {subscriptions.slice(0, 2).map((s) => (
              <span key={s.id}>{moduleLabels[s.module_id] ?? s.module_id}</span>
            ))}
          </div>
        </div>

        {/* 本月 LLM 用量 — TODO Phase 2: connect cp stats */}
        <div style={{ background: 'var(--surface-0)', padding: '22px 24px 20px' }}>
          <div style={kpiLabelStyle}>本月 LLM 用量</div>
          <div style={kpiValueStyle}>
            {/* TODO Phase 2: replace with real from cp /v1/stats/tenant/{id}/monthly */}
            1,237
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-3)',
                marginLeft: 4,
                fontWeight: 400,
                letterSpacing: 0,
              }}
            >
              {' '}/ {tenant.monthly_quota.toLocaleString()}
            </span>
          </div>
          {/* Quota bar */}
          <div
            style={{
              marginTop: 16,
              height: 4,
              width: '100%',
              background: 'var(--surface-3)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                background: 'var(--accent)',
                width: `${Math.min(100, Math.round((1237 / tenant.monthly_quota) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ──── BOSS GRID (核心成员) ──── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHead
          title="核心成员"
          meta={`${bosses.length} 个老板 · boss_user_ids JOIN employees`}
        />

        {bosses.length === 0 ? (
          // Empty state — ASCII art
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 2,
            }}
          >
            <div style={{ letterSpacing: '0.08em' }}>────────</div>
            <div style={{ letterSpacing: '0.2em' }}>·&nbsp;&nbsp;&nbsp;&nbsp;·</div>
            <div style={{ letterSpacing: '0.08em' }}>────────</div>
            <div style={{ marginTop: 16, fontSize: 12 }}>暂无核心成员</div>
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
              → Payload /admin/collections/tenants 配置 boss_user_ids
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: 'var(--border-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {bosses.map((boss, idx) => (
              <BossChip key={boss.staff_id} boss={boss} colorIdx={idx} />
            ))}
          </div>
        )}
      </section>

      {/* ──── IM + SUBSCRIPTIONS ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          marginBottom: 44,
        }}
      >
        {/* IM credentials */}
        <section>
          <SectionHead title="IM 凭证" meta={`${imBindings.length} 个渠道`} />
          <div style={{ border: '1px solid var(--border-subtle)' }}>
            {imBindings.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                }}
              >
                暂无 IM 渠道配置
              </div>
            ) : (
              imBindings.map((b, i) => (
                <div
                  key={b.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < imBindings.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, marginBottom: 4 }}>
                      {channelLabels[b.channel] ?? b.channel} · 上海勤寅企业
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-3)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {b.app_key
                        ? `app_key · ${b.app_key.slice(0, 8)}···${b.app_key.slice(-5)}`
                        : 'app_key 未配置'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
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
                          background: b.has_app_secret ? 'var(--ok)' : 'var(--warn)',
                          display: 'inline-block',
                        }}
                      />
                      {b.has_app_secret ? '已配密钥' : '未配密钥'}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 10,
                        color: 'var(--text-3)',
                        marginTop: 2,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {formatDate(b.createdAt)} 配置
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Subscriptions */}
        <section>
          <SectionHead
            title="订阅模块"
            meta={`${subscriptions.length} 个 · 本月活跃`}
          />
          <div style={{ border: '1px solid var(--border-subtle)' }}>
            {subscriptions.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                }}
              >
                暂无订阅模块
              </div>
            ) : (
              subscriptions.map((s, i) => {
                const pct = s.quota_monthly > 0
                  ? Math.min(100, Math.round((s.quota_used / s.quota_monthly) * 100))
                  : 0
                return (
                  <div
                    key={s.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: i < subscriptions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500, marginBottom: 4 }}>
                        {moduleLabels[s.module_id] ?? s.module_id}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: 'var(--text-3)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        tier {planLabels[s.plan] ?? s.plan} · {s.quota_used.toLocaleString()} / {s.quota_monthly.toLocaleString()} 调用
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 3,
                          background: 'var(--surface-3)',
                          marginTop: 8,
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            background: 'var(--ok)',
                            width: `${pct}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
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
                            background: s.status === 'active' ? 'var(--ok)' : 'var(--warn)',
                            display: 'inline-block',
                          }}
                        />
                        {s.status === 'active' ? '正常' : '已暂停'}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 10,
                          color: 'var(--text-3)',
                          marginTop: 2,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {s.expires_at ? formatDate(s.expires_at) : '永久'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {/* ──── METADATA GRID ──── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHead
          title="元数据"
          meta={`来自 panel.tenants · id=${tenant.id}`}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { key: '客户编号', val: tenant.tenant_id, dim: false },
            { key: '行业', val: industryLabels[tenant.industry] ?? tenant.industry, dim: true },
            { key: '套餐', val: planLabels[tenant.plan] ?? tenant.plan, dim: true },
            { key: '创建时间', val: formatTs(tenant.createdAt), dim: false },
            { key: '最后更新', val: formatTs(tenant.updatedAt), dim: false },
            { key: 'Payload PID', val: String(tenant.id), dim: false },
          ].map((cell) => (
            <div
              key={cell.key}
              style={{ background: 'var(--surface-0)', padding: '14px 18px' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {cell.key}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: cell.dim ? 'var(--text-2)' : 'var(--text-1)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.02em',
                }}
              >
                {cell.val}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

// ─── KPI label/value shared styles ───────────────────────────────────────────

const kpiLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.14em',
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  marginBottom: 14,
}

const kpiValueStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontWeight: 500,
  fontSize: 44,
  lineHeight: 1,
  color: 'var(--text-1)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.04em',
}

const kpiDeltaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  marginTop: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  letterSpacing: '0.04em',
}

// ─── Boss chip (stateful hover) ───────────────────────────────────────────────

function BossChip({ boss, colorIdx }: { boss: BossInfo; colorIdx: number }) {
  const [hovered, setHovered] = React.useState(false)
  const colors = BOSS_COLORS[colorIdx % BOSS_COLORS.length]!

  // Show last 4 chars of staff_id preceded by ···
  const idSuffix = boss.staff_id.length > 4
    ? `···${boss.staff_id.slice(-4)}`
    : boss.staff_id

  // Role display: boss + position if available, else dept
  const roleDisplay = boss.position
    ? `BOSS · ${boss.position}`
    : boss.department
      ? `BOSS · ${boss.department}`
      : 'BOSS'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-1)' : 'var(--surface-0)',
        padding: 18,
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        gap: 14,
        alignItems: 'center',
        cursor: 'default',
        transition: 'background 120ms ease',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 18,
          borderRadius: '50%',
          background: colors.bg,
          color: colors.color,
        }}
      >
        {boss.found ? firstChar(boss.name) : '?'}
      </div>

      {/* Info */}
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: boss.found ? 'var(--text-1)' : 'var(--text-3)',
            marginBottom: 4,
          }}
        >
          {boss.name}
          {!boss.found && (
            <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 6 }}>
              ({boss.staff_id.slice(-4)})
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {roleDisplay}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-disabled)',
            marginTop: 2,
            letterSpacing: '0.02em',
          }}
        >
          {idSuffix}
        </div>
      </div>
    </div>
  )
}
