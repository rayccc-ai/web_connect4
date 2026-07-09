/**
 * WalletConnect Sign Client 封装。
 *
 * 目的：用最底层的方式拿到 verifyContext，把它的 verified 字段（origin / validation /
 * verifyUrl / isScam）暴露给 UI 完整 dump，并映射成 Confluence 文档里的四种 verifyResult
 * （unknown | valid | invalid | scam）。
 *
 * 为什么不用 AppKit 高层：AppKit 不暴露底层 SignClient，拿不到 verifyContext。
 * verifyContext 的权威类型见 @walletconnect/types 的 core/verify.d.ts：
 *   namespace Verify {
 *     interface Context { verified: { origin: string; validation: "UNKNOWN"|"VALID"|"INVALID"; verifyUrl: string; isScam?: boolean } }
 *   }
 * 事件参数（@walletconnect/types sign-client/client.d.ts）：
 *   session_proposal: { verifyContext: Verify.Context, id, params: ProposalTypes.Struct, ... }
 *   session_request:  { verifyContext: Verify.Context, id, topic, params: { request, chainId } }
 *   session_authenticate: { verifyContext: Verify.Context, id, topic, params }
 * 即 verifyContext 始终在事件参数顶层。
 */

import SignClient from '@walletconnect/sign-client'
import type { Verify } from '@walletconnect/types'
import { CURRENT_ORIGIN, MOCK_SCAM, type VerifyTag } from './config'

/** verifyContext.verified 的字段（与 @walletconnect/types 一致，重复声明以避免类型穿透） */
export interface Verified {
  origin: string
  validation: 'UNKNOWN' | 'VALID' | 'INVALID'
  verifyUrl: string
  isScam?: boolean
}

export interface VerifyContext {
  verified: Verified
}

/** 三类被监听事件的统一记录结构 */
export interface VerifyEventRecord {
  id: string
  eventName: 'session_proposal' | 'session_request' | 'session_authenticate'
  timestamp: number
  verifyContext: VerifyContext | undefined
  /** 推导出的 verifyResult（Confluence 四枚举） */
  verifyResult: VerifyTag
  /** 是否为 mock 覆盖（mockScam 开关） */
  mocked: boolean
  raw: unknown
}

export type EventListener = (record: VerifyEventRecord) => void

const STORAGE_PREFIX = 'wc-verify-test'

/** 事件参数顶层一定有 verifyContext（见文件头注释的权威类型） */
type EventWithVerify = { verifyContext?: Verify.Context }

/**
 * 把 verifyContext.verified 映射成 Confluence 接口的 verifyResult 四枚举：
 *   isScam === true → scam（优先级最高，独立于 validation）
 *   validation ∈ {VALID, INVALID, UNKNOWN} → valid / invalid / unknown
 */
export function toVerifyResult(v: VerifyContext | undefined, forceScam = false): VerifyTag {
  if (forceScam || v?.verified?.isScam === true) return 'scam'
  const map: Record<Verified['validation'], VerifyTag> = {
    VALID: 'valid',
    INVALID: 'invalid',
    UNKNOWN: 'unknown',
  }
  return map[v?.verified?.validation ?? 'UNKNOWN'] ?? 'unknown'
}

function newId(eventName: string, ts: number): string {
  return `${eventName}-${ts}-${Math.random().toString(36).slice(2, 8)}`
}

export class WcBridge {
  private listeners: Set<EventListener> = new Set()
  private currentProjectId: string | undefined
  public lastUri: string | undefined

  onEvent(fn: EventListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(record: VerifyEventRecord) {
    this.listeners.forEach((l) => l(record))
  }

  private buildRecord(
    eventName: VerifyEventRecord['eventName'],
    payload: EventWithVerify | undefined,
    raw: unknown,
  ): VerifyEventRecord {
    const vc = payload?.verifyContext
    const forceScam = MOCK_SCAM && !!vc
    const ts = Date.now()
    return {
      id: newId(eventName, ts),
      eventName,
      timestamp: ts,
      verifyContext: vc
        ? {
            verified: {
              origin: vc.verified.origin,
              validation: vc.verified.validation,
              verifyUrl: vc.verified.verifyUrl,
              isScam: forceScam ? true : vc.verified.isScam,
            },
          }
        : undefined,
      verifyResult: toVerifyResult(
        vc
          ? {
              verified: {
                origin: vc.verified.origin,
                validation: vc.verified.validation,
                verifyUrl: vc.verified.verifyUrl,
                isScam: vc.verified.isScam,
              },
            }
          : undefined,
        forceScam,
      ),
      mocked: forceScam,
      raw,
    }
  }

  async init(projectId: string): Promise<void> {
    // 切换 projectId 需要重建 client（projectId 是 init 期参数）
    if (this.client && this.currentProjectId === projectId) return
    this.currentProjectId = projectId
    this.client = await SignClient.init({
      projectId,
      // metadata.url 仅用于钱包 UI 展示，不参与 verify 校验（真实 origin 走 HTTP Origin header）
      metadata: {
        name: 'WC Verify Test Cases',
        description: 'Security team test harness for WalletConnect Verify tags',
        url: CURRENT_ORIGIN,
        icons: [],
      },
      customStoragePrefix: STORAGE_PREFIX,
    })
    this.bindEvents()
  }

  // init 后赋值；用宽松类型避免循环引用标注
  private client: Awaited<ReturnType<typeof SignClient.init>> | undefined

  private bindEvents() {
    if (!this.client) return
    const c = this.client
    c.on('session_proposal', (e) => this.emit(this.buildRecord('session_proposal', e as EventWithVerify, e)))
    c.on('session_request', (e) => this.emit(this.buildRecord('session_request', e as EventWithVerify, e)))
    c.on('session_authenticate', (e) => this.emit(this.buildRecord('session_authenticate', e as EventWithVerify, e)))
  }

  /** dapp 发起连接，返回 { uri, approval }；uri 给钱包扫描 */
  async connect(): Promise<{ uri: string | undefined; approval: () => Promise<unknown> }> {
    if (!this.client) throw new Error('SignClient not initialized')
    const requiredNamespaces = {
      eip155: {
        methods: ['personal_sign', 'eth_sendTransaction', 'eth_signTypedData_v4'],
        chains: ['eip155:1'],
        events: ['accountsChanged', 'chainChanged'],
      },
    }
    const { uri, approval } = await this.client.connect({ requiredNamespaces })
    this.lastUri = uri
    return { uri, approval: approval as () => Promise<unknown> }
  }
}

export const wcBridge = new WcBridge()
