import type { VerifyContext, VerifyEventRecord } from '../wc'
import type { VerifyTag } from '../config'

interface Props {
  record: VerifyEventRecord | null
}

const TAG_COLORS: Record<VerifyTag, string> = {
  valid: '#16a34a',
  invalid: '#d97706',
  unknown: '#6b7280',
  scam: '#dc2626',
}

const TAG_EXPLAIN: Record<VerifyTag, string> = {
  valid: 'origin 命中该 projectId 的 allowlist，且未被情报源标记',
  invalid: 'origin 与该 projectId 登记的 allowlist 域名不匹配，且未被标记',
  unknown: '该 projectId 未配 allowlist，verify server 无法验证 origin',
  scam: 'origin 被安全情报源标记为恶意（isScam=true，独立于 validation）',
}

export function VerifyContextPanel({ record }: Props) {
  if (!record) {
    return (
      <div className="panel empty">
        <p>尚未收到任何 WalletConnect 事件。</p>
        <p>选择一个用例，点「发起连接」，用钱包扫描二维码后会收到 session_proposal 事件。</p>
      </div>
    )
  }
  const vc = record.verifyContext as VerifyContext | undefined
  const tag = record.verifyResult
  return (
    <div className="panel">
      <div className="panel-head">
        <span>最近事件：<code>{record.eventName}</code></span>
        <span className="tag" style={{ background: TAG_COLORS[tag] }}>
          verifyResult = {tag}{record.mocked ? ' (mock)' : ''}
        </span>
      </div>
      <p className="explain">{TAG_EXPLAIN[tag]}</p>
      <table className="vc-table">
        <thead>
          <tr><th>字段</th><th>值</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>verified.origin</td>
            <td><code>{vc?.verified.origin ?? '—'}</code></td>
            <td>请求真实来源域名（HTTP Origin header 自动带，非 dapp 自填）</td>
          </tr>
          <tr>
            <td>verified.validation</td>
            <td><code>{vc?.verified.validation ?? '—'}</code></td>
            <td>只有三个值：VALID / INVALID / UNKNOWN（映射前三种 verifyResult）</td>
          </tr>
          <tr>
            <td>verified.isScam</td>
            <td><code>{String(vc?.verified.isScam ?? '—')}</code></td>
            <td>独立布尔位，true 时 verifyResult=scam（优先于 validation）</td>
          </tr>
          <tr>
            <td>verified.verifyUrl</td>
            <td><code>{vc?.verified.verifyUrl ?? '—'}</code></td>
            <td>verify server 地址</td>
          </tr>
          <tr>
            <td>verifyResult（推导）</td>
            <td><code>{tag}</code></td>
            <td>isScam?→scam : validation→valid/invalid/unknown（对齐 Confluence 接口四枚举）</td>
          </tr>
        </tbody>
      </table>
      <details>
        <summary>原始 verifyContext JSON</summary>
        <pre>{JSON.stringify(vc, null, 2)}</pre>
      </details>
      <details>
        <summary>原始事件 payload</summary>
        <pre>{JSON.stringify(record.raw, null, 2)}</pre>
      </details>
    </div>
  )
}
