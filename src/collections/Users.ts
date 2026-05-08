import type { CollectionConfig } from 'payload'
import { isAdmin } from '../lib/access'

/**
 * 系统用户（含运营 + 客户）。Payload 内置 auth。
 *
 * - role=admin：运营/管理员，看所有 tenant、所有写权限
 * - role=customer：客户对外用户，绑一个 tenant，仅看自己 tenant 的数据（multi-tenant 插件强化）
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: '用户', plural: '用户' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'tenant'],
    group: '系统',
  },
  auth: {
    useAPIKey: true,
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      // customer 只能看到自己
      return { id: { equals: user.id } }
    },
    create: ({ req: { user } }) => isAdmin(user),
    update: ({ req: { user } }) => isAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'role',
      label: '角色',
      type: 'select',
      required: true,
      defaultValue: 'admin',
      options: [
        { label: '管理员（运营）', value: 'admin' },
        { label: '客户', value: 'customer' },
      ],
      admin: { description: 'admin 看全量；customer 仅看自己 tenant' },
    },
    {
      name: 'tenant',
      label: '所属客户',
      type: 'relationship',
      relationTo: 'tenants',
      admin: {
        description: '仅当 role=customer 时必填；admin 留空',
        condition: (data) => data?.role === 'customer',
      },
    },
    {
      name: 'display_name',
      label: '显示名',
      type: 'text',
      admin: { description: '可选。客户面问候语用' },
    },
  ],
}
