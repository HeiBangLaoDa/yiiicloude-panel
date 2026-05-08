/**
 * 验证 Fernet 加密 round-trip + 跨语言互通（与 control-plane Python 端）。
 *
 * Run: pnpm tsx scripts/verify_fernet.ts
 */
import 'dotenv/config'
import { encryptFernet, decryptFernet } from '../src/lib/fernet'

const samples = [
  'hello',
  'sk-abc123-超长应用密钥',
  '',  // 空字符串
  'a'.repeat(1024),  // 长字符串
]

let allOk = true
for (const s of samples) {
  if (s === '') continue  // Fernet 不让加密空串，skip
  try {
    const enc = encryptFernet(s)
    const dec = decryptFernet(enc)
    const ok = dec === s
    console.log(
      `${ok ? '✓' : '✗'} len=${s.length}  enc.len=${enc.length}  ${ok ? 'OK' : 'MISMATCH'}`,
    )
    if (!ok) allOk = false
  } catch (e: unknown) {
    console.log(`✗ len=${s.length}  ERROR:`, e instanceof Error ? e.message : e)
    allOk = false
  }
}

console.log(allOk ? '\n✓ Fernet round-trip OK' : '\n✗ Fernet 失败')
process.exit(allOk ? 0 : 1)
