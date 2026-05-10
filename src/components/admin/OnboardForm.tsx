'use client'

import React, { useState } from 'react'
import {
  Button,
  Checkbox,
  Collapse,
  Form,
  Input,
  InputNumber,
  Result,
  Select,
  Space,
  Steps,
  Typography,
} from 'antd'

const { Text } = Typography

// ──────────────────────────────────────────────────────────────────
// 默认 KB 值（与 taoxi.yaml 保持一致）
// ──────────────────────────────────────────────────────────────────
const DEFAULT_BOSS_PERSONA =
  '公司决策层（CEO / 总经理 / 部门 boss），关注全局数据 + KPI 完成度。'
const DEFAULT_BOSS_VISIBLE =
  '全员日报 / 全员 KPI / 项目进度 / 数据安全告警全集'
const DEFAULT_BOSS_REDLINES =
  '不要泄露员工私人信息（婚姻、家庭、健康）；只汇报工作相关'
const DEFAULT_EMP_PERSONA =
  '公司普通员工，仅查看自己相关的数据。'
const DEFAULT_EMP_VISIBLE =
  '仅本人日报 / 本人 KPI / 本人参与的项目'
const DEFAULT_EMP_REDLINES =
  '不要看其他员工的数据；不要看公司全局指标'

// ──────────────────────────────────────────────────────────────────
// 类型
// ──────────────────────────────────────────────────────────────────
interface ModuleConfig {
  enabled: boolean
  plan: string
  quota_monthly: number
}

interface OnboardResult {
  success: boolean
  tenant_id?: string
  tenant_pid?: number
  modules?: string[]
  skills_linked?: string[]
  started?: boolean
  errors?: string[]
  stage?: string
  created_subscription_ids?: number[]
}

const MODULE_DEFAULTS: Record<string, { plan: string; quota_monthly: number }> = {
  yguard: { plan: 'standard', quota_monthly: 5000 },
  reports: { plan: 'standard', quota_monthly: 10000 },
}

const MODULE_LABELS: Record<string, string> = {
  yguard: '数据安全（yguard）',
  reports: '智能报表（reports）',
}

const MODULE_LABELS_SHORT: Record<string, string> = {
  yguard: '数据安全',
  reports: '智能报表',
}

// ──────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────
export function OnboardForm() {
  const [current, setCurrent] = useState(0)
  const [form1] = Form.useForm()
  const [form2] = Form.useForm()
  const [form3] = Form.useForm()
  const [form4] = Form.useForm()

  const [modules, setModules] = useState<Record<string, ModuleConfig>>({
    yguard: { enabled: false, ...MODULE_DEFAULTS.yguard },
    reports: { enabled: false, ...MODULE_DEFAULTS.reports },
  })
  const [skipKB, setSkipKB] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OnboardResult | null>(null)

  // ── helpers ──────────────────────────────────────────────────────
  const toggleModule = (modId: string, checked: boolean) => {
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], enabled: checked },
    }))
  }

  const updateModuleField = (
    modId: string,
    field: 'plan' | 'quota_monthly',
    value: string | number,
  ) => {
    setModules((prev) => ({
      ...prev,
      [modId]: { ...prev[modId], [field]: value },
    }))
  }

  const atLeastOneModule = Object.values(modules).some((m) => m.enabled)

  // ── step navigation ───────────────────────────────────────────────
  const next = async () => {
    const forms = [form1, form2, form3, form4]
    try {
      await forms[current].validateFields()
      if (current === 1 && !atLeastOneModule) {
        return // validation handled inline
      }
      setCurrent((c) => c + 1)
    } catch {
      // validation error shown by antd
    }
  }

  const prev = () => setCurrent((c) => c - 1)

  // ── submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      await form3.validateFields()
    } catch {
      return
    }

    const step1 = form1.getFieldsValue()
    const step3 = form3.getFieldsValue()
    const step4 = skipKB ? [] : form4.getFieldsValue()

    const enabledModules = Object.entries(modules)
      .filter(([, cfg]) => cfg.enabled)
      .map(([modId, cfg]) => ({
        module_id: modId,
        plan: cfg.plan,
        quota_monthly: cfg.quota_monthly,
      }))

    let tenant_role_kb: Array<{
      role: string
      persona: string
      visible_fields: string
      red_lines: string
    }> = []

    if (!skipKB && step4) {
      tenant_role_kb = [
        {
          role: 'boss',
          persona: step4.boss_persona ?? DEFAULT_BOSS_PERSONA,
          visible_fields: step4.boss_visible ?? DEFAULT_BOSS_VISIBLE,
          red_lines: step4.boss_redlines ?? DEFAULT_BOSS_REDLINES,
        },
        {
          role: 'employee',
          persona: step4.emp_persona ?? DEFAULT_EMP_PERSONA,
          visible_fields: step4.emp_visible ?? DEFAULT_EMP_VISIBLE,
          red_lines: step4.emp_redlines ?? DEFAULT_EMP_REDLINES,
        },
      ]
    }

    const body = {
      tenant: {
        tenant_id: step1.tenant_id,
        company_name: step1.company_name,
        industry: step1.industry ?? '',
        plan: step1.plan ?? 'standard',
        boss_user_ids: step1.boss_user_ids ?? '',
        monthly_quota: step1.monthly_quota ?? 50000,
      },
      modules: enabledModules,
      im_binding: {
        platform: 'dingtalk',
        client_id: step3.client_id,
        app_secret_plain: step3.app_secret_plain,
        agent_id: step3.agent_id,
        aes_key_plain: step3.aes_key_plain ?? '',
      },
      tenant_role_kb,
    }

    setSubmitting(true)
    try {
      const resp = await fetch('/api/admin-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: OnboardResult = await resp.json()
      setResult(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '网络错误'
      setResult({ success: false, errors: [msg] })
    } finally {
      setSubmitting(false)
    }
  }

  // ── result screen ─────────────────────────────────────────────────
  if (result) {
    if (result.success) {
      const moduleNames = (result.modules ?? []).map(
        (m) => MODULE_LABELS_SHORT[m] ?? m,
      )
      const verifyCommands = `
ssh ubuntu@110.40.138.75 "ls -la ~/.hermes/profiles/${result.tenant_id}/skills/"
ssh ubuntu@110.40.138.75 "grep MODULES ~/.hermes/profiles/${result.tenant_id}/.env"
ssh ubuntu@110.40.138.75 "systemctl status hermes-${result.tenant_id}"
`.trim()

      return (
        <Result
          status="success"
          title="客户开通成功"
          subTitle={
            <div>
              <p>
                已开通模块：{moduleNames.join('、')}
                {result.skills_linked && result.skills_linked.length > 0 && (
                  <>（skills_linked: {result.skills_linked.join(', ')}）</>
                )}
              </p>
              <p>hermes 已启动：{result.started ? '是' : '否（需手动检查）'}</p>
            </div>
          }
          extra={[
            <div key="extra" style={{ textAlign: 'left', maxWidth: 640, margin: '0 auto' }}>
              <p style={{ fontWeight: 600 }}>下一步建议</p>
              <ol>
                <li>在钉钉向机器人发一句话，验证连通</li>
                <li>
                  <div>ssh prod 验证命令：</div>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      fontSize: 12,
                      overflow: 'auto',
                    }}
                  >
                    {verifyCommands}
                  </pre>
                </li>
                <li>
                  <Button
                    type="link"
                    href={`/admin/collections/tenants/${result.tenant_pid}`}
                  >
                    打开租户详情页
                  </Button>
                </li>
              </ol>
            </div>,
          ]}
        />
      )
    }

    // failure screen
    return (
      <Result
        status="error"
        title="开通失败"
        subTitle={
          <div>
            {result.stage && <p>出错阶段：{result.stage}</p>}
            {(result.errors ?? []).map((e, i) => (
              <p key={i} style={{ color: '#ff4d4f' }}>
                {e}
              </p>
            ))}
            {result.created_subscription_ids && result.created_subscription_ids.length > 0 && (
              <p>
                已建订阅 ID：{result.created_subscription_ids.join(', ')}（可到{' '}
                <a href="/admin/collections/subscriptions">订阅列表</a>删除重建）
              </p>
            )}
            {result.tenant_pid && (
              <p>
                租户已建 (pid={result.tenant_pid})，可到{' '}
                <a href="/admin/collections/tenants">租户列表</a>查看或删除
              </p>
            )}
          </div>
        }
        extra={[
          <Button key="retry" type="primary" onClick={() => setResult(null)}>
            重试
          </Button>,
          result.tenant_pid ? (
            <Button
              key="detail"
              href={`/admin/collections/tenants/${result.tenant_pid}`}
            >
              打开租户详情排查
            </Button>
          ) : null,
        ]}
      />
    )
  }

  // ── step content ──────────────────────────────────────────────────
  const steps = [
    { title: '租户信息' },
    { title: '模块勾选' },
    { title: '钉钉凭证' },
    { title: 'KB 默认' },
  ]

  const stepContents = [
    // Step 1
    <Form key="step1" form={form1} layout="vertical">
      <Form.Item
        label="客户编号（tenant_id）"
        name="tenant_id"
        rules={[
          { required: true, message: '必填' },
          {
            pattern: /^[a-z0-9_]+$/,
            message: '仅小写英数和下划线',
          },
        ]}
      >
        <Input placeholder="如 acme_corp" />
      </Form.Item>
      <Form.Item
        label="公司全称"
        name="company_name"
        rules={[{ required: true, message: '必填' }]}
      >
        <Input placeholder="如 淘喜科技有限公司" />
      </Form.Item>
      <Form.Item label="行业" name="industry">
        <Select allowClear placeholder="（可选）">
          <Select.Option value="tech">科技</Select.Option>
          <Select.Option value="finance">金融</Select.Option>
          <Select.Option value="manufacturing">制造</Select.Option>
          <Select.Option value="retail">零售</Select.Option>
          <Select.Option value="education">教育</Select.Option>
          <Select.Option value="general">通用</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="套餐" name="plan" initialValue="standard">
        <Select>
          <Select.Option value="trial">试用</Select.Option>
          <Select.Option value="standard">标准</Select.Option>
          <Select.Option value="pro">专业</Select.Option>
        </Select>
      </Form.Item>
      <Form.Item
        label="老板钉钉员工 ID（逗号分隔）"
        name="boss_user_ids"
        extra="多个 staffId 用英文逗号隔开"
      >
        <Input.TextArea rows={2} placeholder="staffId1,staffId2" />
      </Form.Item>
      <Form.Item label="月调用额度" name="monthly_quota" initialValue={50000}>
        <InputNumber min={0} style={{ width: 200 }} />
      </Form.Item>
    </Form>,

    // Step 2
    <Form key="step2" form={form2} layout="vertical">
      {!atLeastOneModule && (
        <Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
          请至少勾选一个模块
        </Text>
      )}
      {(['yguard', 'reports'] as const).map((modId) => (
        <div
          key={modId}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <Checkbox
            checked={modules[modId].enabled}
            onChange={(e) => toggleModule(modId, e.target.checked)}
            style={{ fontWeight: 600, fontSize: 15 }}
          >
            {MODULE_LABELS[modId]}
          </Checkbox>
          {modules[modId].enabled && (
            <div style={{ marginTop: 12, marginLeft: 24 }}>
              <Space>
                <div>
                  <div style={{ marginBottom: 4, fontSize: 12 }}>套餐</div>
                  <Select
                    value={modules[modId].plan}
                    onChange={(v) => updateModuleField(modId, 'plan', v)}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="trial">试用</Select.Option>
                    <Select.Option value="standard">标准</Select.Option>
                    <Select.Option value="pro">专业</Select.Option>
                  </Select>
                </div>
                <div>
                  <div style={{ marginBottom: 4, fontSize: 12 }}>月配额</div>
                  <InputNumber
                    min={0}
                    value={modules[modId].quota_monthly}
                    onChange={(v) =>
                      updateModuleField(modId, 'quota_monthly', v ?? 0)
                    }
                    style={{ width: 140 }}
                  />
                </div>
              </Space>
            </div>
          )}
        </div>
      ))}
    </Form>,

    // Step 3
    <Form key="step3" form={form3} layout="vertical">
      <Form.Item
        label="Client ID（钉钉 AppKey）"
        name="client_id"
        rules={[{ required: true, message: '必填' }]}
      >
        <Input placeholder="钉钉开发者后台 → 应用详情 → Client ID" />
      </Form.Item>
      <Form.Item
        label="App Secret（明文，提交后加密入库）"
        name="app_secret_plain"
        rules={[{ required: true, message: '必填' }]}
      >
        <Input.Password placeholder="Client Secret" />
      </Form.Item>
      <Form.Item
        label="AgentId（钉钉企业内部应用 AgentId）"
        name="agent_id"
        rules={[{ required: true, message: '必填' }]}
      >
        <Input placeholder="AgentId" />
      </Form.Item>
      <Form.Item label="AES Key（回调加密，可选）" name="aes_key_plain">
        <Input.Password placeholder="留空 = 不用回调加密" />
      </Form.Item>
    </Form>,

    // Step 4
    <Form key="step4" form={form4} layout="vertical">
      <Form.Item>
        <Checkbox
          checked={skipKB}
          onChange={(e) => setSkipKB(e.target.checked)}
        >
          跳过 KB，稍后在 /admin/collections/tenant-role-kb 手动补
        </Checkbox>
      </Form.Item>
      {!skipKB && (
        <Collapse
          defaultActiveKey={['boss', 'employee']}
          items={[
            {
              key: 'boss',
              label: '老板（boss）角色 SOUL 模板',
              children: (
                <div>
                  <Form.Item
                    label="Persona（角色描述）"
                    name="boss_persona"
                    initialValue={DEFAULT_BOSS_PERSONA}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="Visible Fields（可见字段，/ 分隔）"
                    name="boss_visible"
                    initialValue={DEFAULT_BOSS_VISIBLE}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="Red Lines（红线规则，; 分隔）"
                    name="boss_redlines"
                    initialValue={DEFAULT_BOSS_REDLINES}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </div>
              ),
            },
            {
              key: 'employee',
              label: '员工（employee）角色 SOUL 模板',
              children: (
                <div>
                  <Form.Item
                    label="Persona（角色描述）"
                    name="emp_persona"
                    initialValue={DEFAULT_EMP_PERSONA}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="Visible Fields（可见字段，/ 分隔）"
                    name="emp_visible"
                    initialValue={DEFAULT_EMP_VISIBLE}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                  <Form.Item
                    label="Red Lines（红线规则，; 分隔）"
                    name="emp_redlines"
                    initialValue={DEFAULT_EMP_REDLINES}
                  >
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />
      )}
    </Form>,
  ]

  return (
    <div>
      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />
      <div style={{ minHeight: 300 }}>{stepContents[current]}</div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {current > 0 && (
          <Button onClick={prev} disabled={submitting}>
            上一步
          </Button>
        )}
        {current < steps.length - 1 && (
          <Button
            type="primary"
            onClick={next}
            disabled={current === 1 && !atLeastOneModule}
          >
            下一步
          </Button>
        )}
        {current === steps.length - 1 && (
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            提交开通
          </Button>
        )}
      </div>
    </div>
  )
}
