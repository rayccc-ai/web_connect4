import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { TEST_CASES, type TestCase, type VerifyTag } from './config'
import { wcBridge, type VerifyEventRecord } from './wc'
import { ProjectIdPicker } from './components/ProjectIdPicker'
import { VerifyContextPanel } from './components/VerifyContextPanel'
import { EventLog } from './components/EventLog'

export function App() {
  const [activeCase, setActiveCase] = useState<TestCase>(TEST_CASES[0])
  const [records, setRecords] = useState<VerifyEventRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [uri, setUri] = useState<string | undefined>()
  const [qr, setQr] = useState<string>('')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle')
  const [error, setError] = useState<string>('')

  // 订阅事件
  useEffect(() => {
    const off = wcBridge.onEvent((r) => {
      setRecords((prev) => [...prev, r])
      setActiveId(r.id)
    })
    return off
  }, [])

  // 生成二维码
  useEffect(() => {
    if (!uri) { setQr(''); return }
    QRCode.toDataURL(uri, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(''))
  }, [uri])

  // 切换用例时重新 init sign-client（projectId 变了）
  useEffect(() => {
    let cancelled = false
    setStatus('idle'); setError(''); setUri(undefined)
    wcBridge.init(activeCase.projectId).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      if (!cancelled) { setStatus('error'); setError(msg) }
    })
    return () => { cancelled = true }
  }, [activeCase.projectId])

  async function handleConnect() {
    setStatus('connecting'); setError('')
    try {
      const { uri: u } = await wcBridge.connect()
      setUri(u)
      if (!u) setError('未拿到 uri（可能已存在 pairing）')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus('error'); setError(msg)
    }
  }

  const latestRecord = useMemo(
    () => records.find((r) => r.id === activeId) ?? null,
    [records, activeId],
  )
  const latestResult: VerifyTag | null = latestRecord?.verifyResult ?? null
  const latestMocked = !!latestRecord?.mocked

  const pidPlaceholder = activeCase.projectId.startsWith('PUT_')

  return (
    <div className="app">
      <header className="app-head">
        <h1>WalletConnect Verify · 四种 tag 测试用例</h1>
        <p className="subtitle">
          给安全团队：复现 verifyResult 四枚举 <code>unknown | valid | invalid | scam</code>，
          并 dump 完整 verifyContext。详见 README。
        </p>
      </header>

      <ProjectIdPicker
        activeKey={activeCase.key}
        onSelect={setActiveCase}
        latestResult={latestResult}
        latestMocked={latestMocked}
      />

      <div className="case-detail">
        <h2>{activeCase.label}</h2>
        <table className="case-table">
          <tbody>
            <tr><td>期望 verifyResult</td><td><b>{activeCase.expectedTag}</b></td></tr>
            <tr><td>projectId</td><td><code>{activeCase.projectId}</code>{pidPlaceholder ? <em className="warn">（占位，需在 .env 填真实 projectId）</em> : null}</td></tr>
            <tr><td>建议部署域名（Origin）</td><td><code>{activeCase.expectedOrigin}</code></td></tr>
            <tr><td>Dashboard allowlist 配置</td><td>{activeCase.allowlistHint}</td></tr>
            <tr><td>触发原因</td><td>{activeCase.trigger}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="main-grid">
        <section className="left">
          <div className="actions">
            <button onClick={handleConnect} disabled={status === 'connecting' || pidPlaceholder}>
              {status === 'connecting' ? '连接中…' : '发起连接'}
            </button>
            {pidPlaceholder ? <span className="warn">先填真实 projectId 才能连接</span> : null}
          </div>
          {error ? <div className="error">{error}</div> : null}
          {qr ? (
            <div className="qr">
              <img src={qr} alt="WC URI QR" />
              <p>用钱包扫描 → 触发 session_proposal → 收到 verifyContext</p>
              <details><summary>URI</summary><code className="uri">{uri}</code></details>
            </div>
          ) : null}
          <VerifyContextPanel record={latestRecord} />
        </section>

        <section className="right">
          <h3>事件历史（session_proposal / session_request / session_authenticate）</h3>
          <EventLog records={records} onSelect={(r) => setActiveId(r.id)} activeId={activeId} />
        </section>
      </div>

      <footer className="app-foot">
        verifyResult 映射：<code>isScam==true → scam</code>，否则{' '}
        <code>validation → valid/invalid/unknown</code>。mock scam 开关：<code>?mockScam=1</code>。
      </footer>
    </div>
  )
}
