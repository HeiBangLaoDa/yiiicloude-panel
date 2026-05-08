import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Docker prod 部署必需：next build 产出 .next/standalone/server.js（自带 minimal 依赖）
  // 让 Dockerfile runner stage 只复制 standalone + .next/static + public，镜像最小化
  output: 'standalone',
  // Next.js 16 默认拒绝跨 origin 的 dev 资源；本地开发同时用 127.0.0.1 和 localhost，
  // 不放行会导致 HMR / chunks 被拦，React 无法 hydrate，admin 显示空白
  allowedDevOrigins: ['127.0.0.1', 'localhost', '0.0.0.0', '192.168.3.106'],
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
