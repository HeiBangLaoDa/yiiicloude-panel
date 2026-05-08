'use client'

import {
  AppstoreOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { App, Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import { useRouter, usePathname } from 'next/navigation'
import React, { useMemo, useState } from 'react'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface AppShellProps {
  children: React.ReactNode
  userEmail: string
  displayName: string
  tenantName: string | null
  role: string
}

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
  { key: '/subscriptions', icon: <AppstoreOutlined />, label: '模块订阅' },
  { key: '/im-config', icon: <CreditCardOutlined />, label: 'IM 配置' },
  { key: '/activity', icon: <HistoryOutlined />, label: '活动日志' },
]

export function AppShell({ children, userEmail, displayName, tenantName, role }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { message } = App.useApp()
  const [collapsed, setCollapsed] = useState(false)

  const selectedKey = useMemo(() => {
    const match = menuItems.find((item) => pathname?.startsWith(item.key))
    return match ? [match.key] : []
  }, [pathname])

  const onLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
      message.success('已退出登录')
      router.replace('/login')
      router.refresh()
    } catch {
      message.error('退出失败')
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: collapsed ? 14 : 18,
            color: '#1677ff',
          }}
        >
          {collapsed ? 'YC' : 'Yiiicloude'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKey}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Space>
            {tenantName && <Text strong>{tenantName}</Text>}
            {role === 'admin' && <Text type="warning">[管理员视角]</Text>}
          </Space>
          <Dropdown
            menu={{
              items: [
                { key: 'email', label: userEmail, disabled: true },
                { type: 'divider' as const },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout },
              ],
            }}
          >
            <Button type="text" style={{ height: 'auto', padding: '4px 8px' }}>
              <Space>
                <Avatar icon={<UserOutlined />} size="small" />
                <Text>{displayName}</Text>
              </Space>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: '100%' }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
