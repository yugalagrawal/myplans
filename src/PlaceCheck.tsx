import { useEffect, useMemo, useState } from 'react'
import type { Person } from './MapView'
import { getTimes, suggestPlaces, type Place, type Suggestion } from './api'
import { distanceKm, pointInPolygon, type LatLng } from './geo'
import { etaMinutes, fmtDuration } from './plan'

type Props = {
  people: Person[]
  midpoint: LatLng | null
  zone: LatLng[] | null
  checked: Place | null
  onCheck: (p: Place | null) => void
}

type Tone = 'good' | 'ok' | 'bad'

export default function PlaceCheck({ people, midpoint, zone, checked, onCheck }: Props) {
  const [query, setQuery] = useState('')
  const [sugg, setSugg] = useState<Suggestion[]>([])
  const [hi, setHi] = useState(-1)
  const [mins, setMins] = useState<number[] | null>(null)
  const [base, setBase] = useState<number | null>(null)

  const peopleKey = people.map(p => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';')

  // type-ahead suggestions, biased towards where the group is
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setSugg([]); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      suggestPlaces(q, midpoint, ctl.signal).then(r => { setSugg(r); setHi(-1) }).catch(() => {})
    }, 250)
    return () => { clearTimeout(t); ctl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // real drive times from everyone to the place (and to the centre, as the yardstick)
  useEffect(() => {
    setMins(null); setBase(null)
    if (!checked || !midpoint) return
    let stale = false
    getTimes(people, [checked, midpoint])
      .then(d => {
        if (stale) return
        setMins(d.map((row, i) => row[0] ?? etaMinutes(distanceKm(people[i], checked))))
        setBase(Math.max(...d.map((row, i) => row[1] ?? etaMinutes(distanceKm(people[i], midpoint)))))
      })
      .catch(() => {
        if (stale) return
        setMins(people.map(p => etaMinutes(distanceKm(p, checked))))
        setBase(Math.max(...people.map(p => etaMinutes(distanceKm(p, midpoint)))))
      })
    return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked?.id, peopleKey])

  const verdict = useMemo(() => {
    if (!mins || !checked) return null
    const worst = Math.max(...mins), best = Math.min(...mins), spread = worst - best
    const nearCentre = base == null || worst <= base * 1.4 + 4
    let tone: Tone = 'bad'
    if (spread <= Math.max(4, worst * 0.25) && nearCentre) tone = 'good'
    else if (spread <= Math.max(8, worst * 0.5)) tone = 'ok'
    const slow = people[mins.indexOf(worst)], fast = people[mins.indexOf(best)]
    return {
      tone, worst, spread, slow, fast,
      inZone: zone ? pointInPolygon(checked, zone) : null,
      title: tone === 'good' ? 'Yes, this is fair' : tone === 'ok' ? 'Mostly fair' : 'Not very fair',
    }
  }, [mins, base, checked, zone, peopleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(s: Suggestion) {
    onCheck({ id: 'check', lat: s.lat, lng: s.lng, name: s.title, sub: s.subtitle })
    setQuery(''); setSugg([])
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setSugg([])
    if (!sugg.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % sugg.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h <= 0 ? sugg.length - 1 : h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sugg[hi >= 0 ? hi : 0]) }
  }

  return (
    <div className="check">
      <div className="cap">Is a place fair?</div>
      <div className="group">
        <div className="item add">
          <span className="plus">⌖</span>
          <input
            value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Check a place, e.g. Third Wave Coffee, HSR" autoComplete="off"
          />
        </div>
        {sugg.map((s, i) => (
          <button key={s.id} className={i === hi ? 'item sugg on' : 'item sugg'} onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); pick(s) }}>
            <span className="plus">⌖</span>
            <span className="grow"><b>{s.title}</b><small>{s.subtitle}</small></span>
          </button>
        ))}
      </div>

      {checked && (
        <div className={`verdict ${verdict?.tone ?? 'wait'}`}>
          <div className="v-head">
            <span className="v-ico">{!verdict ? '…' : verdict.tone === 'good' ? '✓' : verdict.tone === 'ok' ? '!' : '✕'}</span>
            <div className="grow">
              <b>{verdict ? verdict.title : 'Checking drive times…'}</b>
              <small>{checked.name}</small>
            </div>
            <button className="x" onClick={() => onCheck(null)} aria-label="Clear">×</button>
          </div>
          {verdict && mins && (
            <>
              <div className="v-times">
                {people.map((p, i) => (
                  <span key={p.id}><i style={{ background: p.color }} />{p.name} <b>{fmtDuration(mins[i])}</b></span>
                ))}
              </div>
              <p className="v-note">
                {verdict.spread <= 2
                  ? 'Everyone drives about the same.'
                  : `${verdict.slow.name} drives ${fmtDuration(verdict.spread)} more than ${verdict.fast.name}.`}
                {base != null && ` Longest drive is ${fmtDuration(verdict.worst)}, against ${fmtDuration(base)} at the exact centre.`}
                {verdict.inZone != null && (verdict.inZone ? ' It sits inside the blue overlap.' : ' It is outside the blue overlap.')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
