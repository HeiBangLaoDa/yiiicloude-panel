'use client'

import { App, ConfigProvider, theme } from 'antd'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

// ──────────────────────────────────────────────
// AntD dark theme override (DESIGN_SPEC §7.1)
// ──────────────────────────────────────────────
const opsTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#C7F23B',
    colorBgBase: '#0A0A0A',
    colorTextBase: '#F5F5F4',
    colorBgContainer: '#0A0A0A',
    colorBgElevated: '#131313',
    colorBorder: '#2A2A2A',
    colorBorderSecondary: '#1F1F1F',
    colorSuccess: '#4ADE80',
    colorWarning: '#FBBF24',
    colorError: '#F87171',
    colorInfo: '#94A3B8',
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 2,
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    fontFamilyCode: 'var(--font-mono)',
    motionDurationFast: '120ms',
    motionDurationMid: '180ms',
    motionDurationSlow: '280ms',
    boxShadow: 'none',
    boxShadowSecondary: 'none',
  },
  components: {
    Table: {
      headerBg: 'transparent',
      headerColor: '#6B6560',
      headerSplitColor: '#1F1F1F',
      rowHoverBg: '#131313',
      borderColor: '#1F1F1F',
      cellPaddingBlock: 16,
      cellPaddingInline: 8,
    },
    Tag: {
      defaultBg: 'transparent',
      defaultColor: '#A8A29E',
    },
    Button: {
      colorPrimary: '#C7F23B',
      primaryColor: '#0A0F00',
      borderRadius: 4,
    },
  },
}

// ──────────────────────────────────────────────
// Header clock (client-side only to avoid SSR mismatch)
// ──────────────────────────────────────────────
function LiveClock() {
  const [display, setDisplay] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      const y = now.getFullYear()
      const mo = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const h = String(now.getHours()).padStart(2, '0')
      const mi = String(now.getMinutes()).padStart(2, '0')
      const s = String(now.getSeconds()).padStart(2, '0')
      return `${y}-${mo}-${d} · ${h}:${mi}:${s}`
    }
    setDisplay(fmt())
    timerRef.current = setInterval(() => setDisplay(fmt()), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--text-3)',
        letterSpacing: '0.04em',
      }}
    >
      {display}
    </span>
  )
}

// ──────────────────────────────────────────────
// Nav SVG icons (inline, matches mockup)
// ──────────────────────────────────────────────
const IconGrid = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <rect x="1.5" y="1.5" width="5.5" height="5.5" />
    <rect x="9" y="1.5" width="5.5" height="5.5" />
    <rect x="1.5" y="9" width="5.5" height="5.5" />
    <rect x="9" y="9" width="5.5" height="5.5" />
  </svg>
)
const IconTenant = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinejoin="round"
  >
    <path d="M2 14V5L8 1.5L14 5V14H10V9.5H6V14H2Z" />
  </svg>
)
const IconList = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <path d="M2.5 4H13.5M2.5 8H13.5M2.5 12H10" />
  </svg>
)
const IconChart = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinejoin="round"
  >
    <path d="M2 14L6 8L9.5 11L14 4.5" />
    <path d="M10 4.5H14V8.5" />
  </svg>
)
const IconDoc = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
  >
    <rect x="2.5" y="2" width="11" height="12" />
    <path d="M5 5.5H11M5 8H11M5 10.5H8" />
  </svg>
)
const IconDown = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.25"
    strokeLinejoin="round"
  >
    <path d="M8 1.5V11M3.5 7L8 11.5L12.5 7" />
    <path d="M2 14H14" />
  </svg>
)

// ──────────────────────────────────────────────
// Nav item
// ──────────────────────────────────────────────
interface NavItemProps {
  href?: string
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
}

function NavItem({ href, icon, label, active, disabled }: NavItemProps) {
  const base: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 8px',
    borderRadius: 4,
    fontSize: 13,
    cursor: disabled ? 'default' : 'pointer',
    position: 'relative',
    transition: 'background 120ms ease, color 120ms ease',
    color: disabled ? 'var(--text-disabled)' : active ? 'var(--accent)' : 'var(--text-2)',
    background: active ? 'var(--surface-1)' : 'transparent',
    pointerEvents: disabled ? 'none' : 'auto',
    textDecoration: 'none',
  }

  const inner = (
    <>
      {active && (
        <span
          style={{
            position: 'absolute',
            left: -16,
            top: 6,
            bottom: 6,
            width: 2,
            background: 'var(--accent)',
          }}
        />
      )}
      <span style={{ flexShrink: 0, width: 14, height: 14, display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      {label}
    </>
  )

  if (disabled || !href) {
    return <div style={base}>{inner}</div>
  }

  return (
    <Link href={href} style={base}>
      {inner}
    </Link>
  )
}

// ──────────────────────────────────────────────
// OpsShell
// ──────────────────────────────────────────────
export function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isOverview = pathname === '/ops'
  const isTenant = pathname?.startsWith('/ops/tenants')

  return (
    <ConfigProvider theme={opsTheme}>
      <App>
        {/* Shell grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'var(--sidebar-w) 1fr',
            gridTemplateRows: 'var(--header-h) 1fr',
            minHeight: '100vh',
            background: 'var(--surface-0)',
          }}
        >
          {/* HEADER */}
          <header
            style={{
              gridColumn: '1 / -1',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 24px',
              gap: 32,
              background: 'var(--surface-0)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              height: 'var(--header-h)',
            }}
          >
            {/* Brand mark */}
            <Link
              href="/ops"
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: '0.08em',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'flex-end',
                  gap: 2,
                  height: 16,
                  transform: 'translateY(2px)',
                }}
              >
                <span style={{ width: 3, height: 8, background: 'var(--accent)', display: 'block' }} />
                <span style={{ width: 3, height: 12, background: 'var(--accent)', display: 'block' }} />
                <span style={{ width: 3, height: 16, background: 'var(--accent)', display: 'block' }} />
              </span>
              <span style={{ color: 'var(--text-1)' }}>YIII</span>
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>/ ops</span>
            </Link>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Status area */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text-3)',
                letterSpacing: '0.04em',
              }}
            >
              {/* Status dots — 4 ok + 1 idle */}
              <span
                title="4/5 ONLINE"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--dot-ok)' }}
                  />
                ))}
                <span
                  style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--dot-idle)' }}
                />
              </span>

              <span style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                4/5 ONLINE
              </span>

              <LiveClock />
            </div>

            {/* User avatar */}
            <div
              title="charles · owner"
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'var(--surface-3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-2)',
                letterSpacing: '0.06em',
              }}
            >
              CL
            </div>
          </header>

          {/* SIDEBAR */}
          <aside
            style={{
              borderRight: '1px solid var(--border-subtle)',
              padding: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              background: 'var(--surface-0)',
            }}
          >
            {/* 运营 section */}
            <div style={{ padding: '0 16px 4px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  padding: '0 8px 10px',
                }}
              >
                运营
              </div>
              <NavItem href="/ops" icon={<IconGrid />} label="总览" active={isOverview} />
              <NavItem
                href="/ops/tenants"
                icon={<IconTenant />}
                label="租户"
                active={isTenant}
              />
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 16px' }} />

            {/* 路线图 section */}
            <div style={{ padding: '0 16px 4px' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  padding: '0 8px 10px',
                }}
              >
                路线图
              </div>
              <div style={{ opacity: 0.4 }}>
                <NavItem icon={<IconList />} label="订阅" disabled />
                <NavItem icon={<IconChart />} label="用量" disabled />
                <NavItem icon={<IconDoc />} label="审计" disabled />
                <NavItem icon={<IconDown />} label="下发" disabled />
              </div>
            </div>

            {/* Sidebar footer */}
            <div
              style={{
                marginTop: 'auto',
                padding: 16,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-3)',
                borderTop: '1px solid var(--border-subtle)',
                letterSpacing: '0.04em',
              }}
            >
              <div>v0.1.0-mvp · 2026-05-25</div>
              <div style={{ marginTop: 4, color: 'var(--text-disabled)' }}>CHARLES · OWNER</div>
            </div>
          </aside>

          {/* MAIN */}
          <main
            style={{
              background: 'var(--surface-0)',
              overflowY: 'auto',
            }}
          >
            {children}
          </main>
        </div>
      </App>
    </ConfigProvider>
  )
}
