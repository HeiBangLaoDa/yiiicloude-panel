'use client'

import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { App, Button, Card, Form, Input, Typography } from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState } from 'react'

const { Title, Text } = Typography

interface LoginValues {
  email: string
  password: string
}

// useSearchParams 必须包在 Suspense 内才能 next build prerender 通过
// (Next 16 强制要求；否则 build 时 /login 静态预渲染报 missing-suspense-with-csr-bailout)
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)

  const next = searchParams.get('next') || '/dashboard'

  const onFinish = async (values: LoginValues) => {
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const errMsg =
          body?.errors?.[0]?.message || body?.message || '登录失败，请检查邮箱和密码'
        message.error(errMsg)
        return
      }
      message.success('登录成功')
      router.replace(next)
      router.refresh()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card style={{ width: 400, maxWidth: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Yiiicloude
        </Title>
        <Text type="secondary">客户自助面板</Text>
      </div>
      <Form<LoginValues> layout="vertical" onFinish={onFinish} disabled={loading}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@company.com" autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            autoComplete="current-password"
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 24,
      }}
    >
      <Suspense fallback={<Card style={{ width: 400 }}>加载中...</Card>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
