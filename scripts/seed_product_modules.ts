/**
 * seed_product_modules.ts — 初始化集团产品矩阵（ProductModules collection）
 *
 * 幂等：按 module_id 查重，已存在则更新，不存在则创建。
 *
 * 用法：pnpm tsx scripts/seed_product_modules.ts
 *
 * 前置：panel dev server 无需运行，脚本直接调 payload SDK 连 PG。
 *       DATABASE_URI 读自 .env（dotenv/config 自动加载）。
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const MODULES = [
  {
    module_id: 'yguard',
    label_zh: '数据安全',
    tagline: '识别员工异常文件操作、U盘外发、敏感数据访问等数据安全风险',
    key_features: [
      { value: 'U盘外发文件审计（who/when/what 全链路追溯）' },
      { value: '员工文档操作行为分析（创建/修改/删除/重命名）' },
      { value: '大文件传输预警（≥指定阈值告警）' },
      { value: '敏感网站访问记录' },
      { value: '异常登录与权限变更监控' },
    ],
    target_audience:
      '适合需要监管员工电脑数据外发、防止数据泄露的企业；已部署 IP-guard 数据安全终端的客户首选',
    trigger_examples: [
      { value: '昨天谁拷了 U 盘文件' },
      { value: '查一下张三最近一周修改了哪些文档' },
      { value: '上周有没有大文件外传' },
      { value: '谁访问了敏感网站' },
    ],
    upsell_cta:
      '您提到的是数据安全审计相关需求。如需了解《数据安全》产品详情或开通试用，请联系贵司客户经理或运营。',
    order: 10,
    active: true,
  },
  {
    module_id: 'reports',
    label_zh: '智能报表',
    tagline: '基于公司业务数据的智能日报/周报/KPI/营收报表查询与分析',
    key_features: [
      { value: '日报/周报自动生成与查询' },
      { value: 'KPI 完成度统计与对比分析' },
      { value: '员工绩效报表查询' },
      { value: '会议纪要与项目进度报表' },
      { value: '营收/财务报表实时查询' },
    ],
    target_audience: '适合需要把业务系统数据快速变成钉钉群可查询报表的中小企业；老板移动办公场景',
    trigger_examples: [
      { value: '昨天日报谁没交' },
      { value: '查 4 月营收' },
      { value: '本月 KPI 完成度' },
      { value: '上周项目进展' },
      { value: '5 月部门绩效排名' },
    ],
    upsell_cta:
      '您提到的是智能报表相关需求。如需了解《智能报表》产品详情或开通试用，请联系贵司客户经理或运营。',
    order: 20,
    active: true,
  },
]

async function main() {
  const payload = await getPayload({ config })

  for (const mod of MODULES) {
    const existing = await payload.find({
      collection: 'product-modules',
      where: { module_id: { equals: mod.module_id } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs[0]) {
      const updated = await payload.update({
        collection: 'product-modules',
        id: existing.docs[0].id,
        data: mod,
        overrideAccess: true,
      })
      console.log(`[update] ${mod.module_id} → id=${updated.id}`)
    } else {
      const created = await payload.create({
        collection: 'product-modules',
        data: mod,
        overrideAccess: true,
      })
      console.log(`[create] ${mod.module_id} → id=${created.id}`)
    }
  }

  console.log('\n✅ seed_product_modules 完成')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
