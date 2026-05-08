import { AntdRegistry } from '@ant-design/nextjs-registry'
import React from 'react'

import { CustomerProviders } from './providers'

export const metadata = {
  title: '客户面板 — Yiiicloude',
  description: 'Yiiicloude 客户自助面板',
}

export default function CustomerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>
        <AntdRegistry>
          <CustomerProviders>{children}</CustomerProviders>
        </AntdRegistry>
      </body>
    </html>
  )
}
