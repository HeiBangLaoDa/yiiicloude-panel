/**
 * `fernet` v0.3.3 没有官方 TypeScript types，自己写最小 declaration。
 * 文档：https://github.com/csquared/fernet.js
 */
declare module 'fernet' {
  export class Secret {
    constructor(secret: string)
  }
  export interface TokenOptions {
    secret: Secret
    token?: string
    ttl?: number
    iv?: number[]
    time?: Date | number
  }
  export class Token {
    constructor(opts: TokenOptions)
    encode(message: string): string
    decode(): string
  }
  const _default: { Secret: typeof Secret; Token: typeof Token }
  export default _default
}
