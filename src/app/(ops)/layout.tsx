import { AntdRegistry } from '@ant-design/nextjs-registry'
import React from 'react'

import './ops.css'

// Fonts loaded via Google Fonts CDN <link>; next/font/google + Turbopack 16.2 不兼容
// (Module not found: @vercel/turbopack-next/internal/font/google/font on Noto Sans SC)
// ops.css 里直接用 family-stack，不靠 CSS var 注入

export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
