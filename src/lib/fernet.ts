/**
 * Fernet 对称加密 — 与 control-plane Python 端 cryptography.fernet 完全兼容。
 *
 * 关键约束：必须使用 control-plane 同一把 SECRET_FERNET_KEY，否则历史密文（im_channel_binding 表里的）
 * 在 Payload 端解不开，搬迁到 panel db 后客户机器人会全部失效。
 *
 * encrypt() 输出的是标准 Fernet token（base64url），可直接给 control-plane decrypt 使用。
 */
import Fernet from 'fernet'

let _secret: InstanceType<typeof Fernet.Secret> | null = null

function getSecret() {
  if (_secret) return _secret
  const key = process.env.SECRET_FERNET_KEY
  if (!key) {
    throw new Error(
      'SECRET_FERNET_KEY 未配置。请在 .env 设置（与 control-plane 同一把）',
    )
  }
  _secret = new Fernet.Secret(key)
  return _secret
}

export function encryptFernet(plaintext: string): string {
  const token = new Fernet.Token({ secret: getSecret() })
  return token.encode(plaintext)
}

export function decryptFernet(ciphertext: string): string {
  const token = new Fernet.Token({
    secret: getSecret(),
    token: ciphertext,
    ttl: 0,  // 不限制 token 过期时间（control-plane 历史密文可能写于很久之前）
  })
  return token.decode()
}

/** 试解密；失败返 null（用于检测密文是否合法 / 密钥是否匹配） */
export function tryDecryptFernet(ciphertext: string): string | null {
  try {
    return decryptFernet(ciphertext)
  } catch {
    return null
  }
}
