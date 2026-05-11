import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { mcpPlugin } from '@payloadcms/plugin-mcp'
import { zh } from '@payloadcms/translations/languages/zh'
import { zhTw } from '@payloadcms/translations/languages/zhTw'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Tenants } from './collections/Tenants'
import { Subscriptions } from './collections/Subscriptions'
import { ImBindings } from './collections/ImBindings'
import { RoutingRules } from './collections/RoutingRules'
import { UsageRecords } from './collections/UsageRecords'
import { AuditLog } from './collections/AuditLog'
import { TenantRoleKB } from './collections/TenantRoleKB'
import { Employees } from './collections/Employees'
import { ProductModules } from './collections/ProductModules'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        Onboard: {
          Component: '@/components/admin/OnboardView#OnboardView',
          path: '/onboard',
        },
      },
      beforeNavLinks: ['@/components/admin/OnboardNavLink#OnboardNavLink'],
    },
  },
  // 中文一等公民。zh 简体；zh-TW 繁体；en 兜底
  i18n: {
    supportedLanguages: { zh, 'zh-TW': zhTw, en },
    fallbackLanguage: 'zh',
  },
  collections: [
    Users,
    Media,
    Tenants,
    Subscriptions,
    ImBindings,
    RoutingRules,
    UsageRecords,
    AuditLog,
    TenantRoleKB,
    Employees,
    ProductModules,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // 默认 schema = public；不设 schemaName，让 Payload 直接用 public（与 control-plane 不在同库，无冲突）
    // push: 启动时自动同步 schema 到 PG（建表/加列；drizzle 行为）。
    // dev 默认 true；prod 默认 false（要求显式跑 payload migrate）。
    // panel 当前未维护 migration 文件 → prod 也强制 push:true 让首次启动自建表。
    // 引入正式 migration 后改回 push:false + CI 跑 payload migrate。
    push: true,
  }),
  sharp,
  plugins: [
    // MCP server — 让 Claude / Cursor 通过自然语言操作业务数据
    // 访问入口 POST /api/mcp，需要 Bearer API key（在 admin → MCP API Keys 创建）
    mcpPlugin({
      collections: {
        tenants: { enabled: true, description: '客户/租户主体' },
        subscriptions: { enabled: true, description: '客户的模块订阅记录（plan + 配额）' },
        'im-bindings': {
          enabled: { find: true, create: true, update: true, delete: false },
          description: 'IM 凭证（钉钉/企微/飞书）。密文字段不返回明文',
        },
        'routing-rules': { enabled: true, description: 'IM 消息路由规则' },
        'usage-records': {
          enabled: { find: true, create: false, update: false, delete: false },
          description: '调用日志，仅查询',
        },
        'audit-log': {
          enabled: { find: true, create: false, update: false, delete: false },
          description: '审计日志，仅查询',
        },
      },
    }),
  ],
})
