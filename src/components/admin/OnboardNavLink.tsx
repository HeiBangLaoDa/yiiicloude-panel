import React from 'react'
import Link from 'next/link'

/**
 * Payload admin beforeNavLinks component.
 * 在 admin 侧边栏顶部渲染"新客户开通"快捷入口。
 */
export function OnboardNavLink() {
  return (
    <div style={{ padding: '8px 16px' }}>
      <Link
        href="/admin/onboard"
        style={{
          display: 'block',
          padding: '8px 12px',
          background: '#f0f5ff',
          borderRadius: 6,
          color: '#1677ff',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: 14,
        }}
      >
        ☆ 新客户开通
      </Link>
    </div>
  )
}

export default OnboardNavLink
