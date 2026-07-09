/**
 * 四种 verify tag 的测试用例配置。
 *
 * projectId 由你方在 WalletConnect Cloud Dashboard 创建 4 个项目后填入
 * （每个项目的 origin allowlist 按 README 的矩阵配置）。
 *
 * 部署时通过 Vite 的 env 注入（VITE_PID_VALID / VITE_PID_INVALID / VITE_PID_UNKNOWN / VITE_PID_SCAM），
 * 没注入则用这里的占位符，方便先跑通流程。
 *
 * 注意：origin 不是 dapp 在 metadata.url 自填的，而是浏览器 HTTP Origin header 自动带的；
 * 这里 expectedOrigin 仅用于在 UI 上提示「该用例应部署到哪个域名」，不参与校验。
 */

export type VerifyTag = 'valid' | 'invalid' | 'unknown' | 'scam'

export interface TestCase {
  key: VerifyTag
  /** 该用例期望复现的 verifyResult，对应 Confluence 接口四枚举 */
  expectedTag: VerifyTag
  projectId: string
  /** 该用例建议部署的域名（HTTP Origin），用于让 allowlist 比对产生对应结果 */
  expectedOrigin: string
  /** Dashboard 上该 projectId 应配的 allowlist（说明用，不参与运行） */
  allowlistHint: string
  /** 给安全团队看的一句话触发原因 */
  trigger: string
  label: string
}

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {}

// 运行时取真实部署 origin（Vercel → *.vercel.app，GitHub Pages → *.github.io，本地 → localhost）。
// 这样 expectedOrigin / allowlistHint 自动适配部署平台，无需提前注入域名。
export const CURRENT_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'

export const TEST_CASES: TestCase[] = [
  {
    key: 'valid',
    expectedTag: 'valid',
    projectId: env.VITE_PID_VALID ?? 'PUT_VALID_PROJECT_ID',
    expectedOrigin: CURRENT_ORIGIN,
    allowlistHint: `${CURRENT_ORIGIN}（精确匹配当前部署域名）`,
    trigger: '请求真实 origin 命中该 projectId 的 allowlist，且未被安全情报源标记',
    label: 'Case 1 · valid',
  },
  {
    key: 'invalid',
    expectedTag: 'invalid',
    projectId: env.VITE_PID_INVALID ?? 'PUT_INVALID_PROJECT_ID',
    expectedOrigin: CURRENT_ORIGIN,
    allowlistHint: `在 Dashboard 配一个与 ${CURRENT_ORIGIN} 故意不一致的域名`,
    trigger: '请求真实 origin 与该 projectId 登记的 allowlist 域名不匹配，但未被标记',
    label: 'Case 2 · invalid',
  },
  {
    key: 'unknown',
    expectedTag: 'unknown',
    projectId: env.VITE_PID_UNKNOWN ?? 'PUT_UNKNOWN_PROJECT_ID',
    expectedOrigin: CURRENT_ORIGIN,
    allowlistHint: '（留空，不配 allowlist）',
    trigger: '该 projectId 未配 allowlist，verify server 无法验证 origin',
    label: 'Case 3 · unknown',
  },
  {
    key: 'scam',
    expectedTag: 'scam',
    projectId: env.VITE_PID_SCAM ?? 'PUT_SCAM_PROJECT_ID',
    expectedOrigin: `${CURRENT_ORIGIN}（需已被情报源标记，或用 ?mockScam=1 演示）`,
    allowlistHint: '任意；关键是该域名需被 WalletConnect 合作情报源标记为恶意',
    trigger: 'verify server 命中安全情报源 → isScam=true（独立于 validation）',
    label: 'Case 4 · scam',
  },
]

/** 是否启用 mock scam（?mockScam=1 时，scam 用例本地覆盖 isScam=true 供 UI 演示） */
export const MOCK_SCAM =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('mockScam')
