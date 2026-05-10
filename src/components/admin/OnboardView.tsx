import React from 'react'
import { isAdmin } from '@/lib/access'
import { OnboardForm } from './OnboardForm'

/**
 * Payload admin custom view — 新客户开通向导入口。
 * Server component：校验 admin 权限，渲染 OnboardForm（'use client'）。
 * Payload v3 会将 user 作为 props 注入。
 */
export async function OnboardView({ user }: { user?: { role?: string; collection?: string } | null }) {
  if (!isAdmin(user)) {
    return (
      <div style={{ padding: 40 }}>
        <h2>无权限</h2>
        <p>仅管理员可访问开通向导。</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 8 }}>☆ 新客户开通向导</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        4 步建齐 Tenant + 订阅 + IM 凭证 + KB，最后一键触发 control-plane provision 启动 hermes profile。
      </p>
      <OnboardForm />
    </div>
  )
}
