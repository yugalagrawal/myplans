import { useState } from 'react'
import { CATS, customCat, type Cat } from './categories'

type Props = { value: Cat | null; onChange: (c: Cat | null) => void }

export default function ActivityPicker({ value, onChange }: Props) {
  const [q, setQ] = useState('')
  const text = q.trim().toLowerCase()
  const list = text ? CATS.filter(c => `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(text)) : CATS
  const showCustom = text.length > 1 && !CATS.some(c => c.label.toLowerCase() === text)

  const toggle = (c: Cat) => onChange(value?.key === c.key ? null : c)
  const choose = (c: Cat) => { toggle(c); if (value?.key !== c.key) setQ('') }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (list.length === 1) choose(list[0])
    else if (!list.length && showCustom) choose(customCat(q.trim()))
  }

  return (
    <div className="act">
      <div className="afield">
        <span aria-hidden>⌕</span>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder="Search activities: lake, pizza, yoga…" />
        {q && <button className="x" onClick={() => setQ('')} aria-label="Clear">×</button>}
      </div>
      <div className={text ? 'achips wrap' : 'achips'}>
        {list.map(c => (
          <button key={c.key} className={value?.key === c.key ? 'achip on' : 'achip'} onClick={() => choose(c)}>
            <span className="adot" style={{ background: c.color }}>{c.emoji}</span>{c.label}
          </button>
        ))}
        {showCustom && (
          <button className="achip custom" onClick={() => choose(customCat(q.trim()))}>
            <span className="adot" style={{ background: '#0a84ff' }}>🔎</span>Find “{q.trim()}”
          </button>
        )}
        {text && !list.length && !showCustom && <span className="hint">Keep typing…</span>}
      </div>
      {value?.key.startsWith('custom:') && (
        <div className="hint">Showing places matching “{value.label}”. <button className="link" onClick={() => onChange(null)}>Clear</button></div>
      )}
    </div>
  )
}
