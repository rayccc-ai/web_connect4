import type { VerifyEventRecord } from '../wc'
import type { VerifyTag } from '../config'

interface Props {
  records: VerifyEventRecord[]
  onSelect: (r: VerifyEventRecord) => void
  activeId: string | null
}

const TAG_COLORS: Record<VerifyTag, string> = {
  valid: '#16a34a',
  invalid: '#d97706',
  unknown: '#6b7280',
  scam: '#dc2626',
}

function ts(t: number): string {
  const d = new Date(t)
  return `${d.toLocaleTimeString('zh-CN', { hour12: false })}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function EventLog({ records, onSelect, activeId }: Props) {
  if (records.length === 0) {
    return <div className="log empty">事件历史为空</div>
  }
  return (
    <div className="log">
      {records
        .slice()
        .reverse()
        .map((r) => (
          <button
            key={r.id}
            className={`log-row${r.id === activeId ? ' active' : ''}`}
            onClick={() => onSelect(r)}
          >
            <span className="log-time">{ts(r.timestamp)}</span>
            <span className="log-event">{r.eventName}</span>
            <span
              className="log-tag"
              style={{ background: TAG_COLORS[r.verifyResult] }}
            >
              {r.verifyResult}{r.mocked ? '*' : ''}
            </span>
          </button>
        ))}
    </div>
  )
}
