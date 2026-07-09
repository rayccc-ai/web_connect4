import { TEST_CASES, CURRENT_ORIGIN, type VerifyTag, type TestCase } from '../config'

interface Props {
  activeKey: VerifyTag
  onSelect: (tc: TestCase) => void
  /** 最近一条事件的 verifyResult，null=还没连过 */
  latestResult: VerifyTag | null
  latestMocked: boolean
}

const TAG_COLORS: Record<VerifyTag, string> = {
  valid: '#16a34a',
  invalid: '#d97706',
  unknown: '#6b7280',
  scam: '#dc2626',
}

export function ProjectIdPicker({ activeKey, onSelect, latestResult, latestMocked }: Props) {
  return (
    <div className="picker">
      <div className="picker-row">
        {TEST_CASES.map((tc) => {
          const active = tc.key === activeKey
          const hit = active && latestResult
          return (
            <button
              key={tc.key}
              className={`case-btn${active ? ' active' : ''}`}
              style={{ borderColor: active ? TAG_COLORS[tc.key] : undefined }}
              onClick={() => onSelect(tc)}
            >
              <div className="case-label">{tc.label}</div>
              <div className="case-sub">
                期望 <b style={{ color: TAG_COLORS[tc.key] }}>{tc.expectedTag}</b>
                {hit ? (
                  <>
                    {' '}· 实际{' '}
                    <b style={{ color: TAG_COLORS[latestResult!] }}>
                      {latestResult}{latestMocked ? ' (mock)' : ''}
                    </b>
                  </>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
      <div className="origin-bar">
        当前部署 origin（HTTP Origin，参与 verify 校验）：<code>{CURRENT_ORIGIN}</code>
      </div>
    </div>
  )
}
