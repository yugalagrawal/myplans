import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './MapView'
import MapShot from './MapShot'
import { centroid, distanceKm, intersectionZone, pointInPolygon, type LatLng } from './geo'
import { findPlaces, getRoute, getTimes, searchPlace, suggestPlaces, type Place, type Route, type Suggestion } from './api'
import { CATS } from './categories'
import {
  COLORS, emptyPlan, etaMinutes, examplePlan, fmtDuration, loadInitial, loadSaved,
  persist, shareUrl, storeSaved, type Plan, type Saved,
} from './plan'

export default function Planner() {
  const [plan, setPlan] = useState<Plan>(loadInitial)
  const [saved, setSaved] = useState<Saved[]>(loadSaved)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const [focus, setFocus] = useState<LatLng | null>(null)
  const [toast, setToast] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [catKey, setCatKey] = useState<string | null>(null)
  const [found, setFound] = useState<Place[]>([])
  const [times, setTimes] = useState<(number | null)[][] | null>(null)
  const [pState, setPState] = useState<'idle' | 'loading' | 'ok' | 'empty' | 'error'>('idle')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Place | null>(null)
  const [routes, setRoutes] = useState<Record<number, Route | 'err'>>({})
  const [sugg, setSugg] = useState<Suggestion[]>([])
  const [hi, setHi] = useState(-1)

  const { people } = plan
  const patch = (p: Partial<Plan>) => setPlan(prev => ({ ...prev, ...p }))
  const cat = CATS.find(c => c.key === catKey) ?? null

  useEffect(() => persist(plan), [plan])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  // ---- the meeting zone: where everyone's reach overlaps -------------------------------------
  const peopleKey = people.map(p => `${p.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';')
  const midpoint = useMemo(() => centroid(people), [peopleKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const zoneKm = midpoint && people.length > 1 ? Math.max(2, 1.6 * Math.max(...people.map(p => distanceKm(p, midpoint)))) : 0
  const zone = useMemo(
    () => (zoneKm ? intersectionZone(people, zoneKm) : null),
    [peopleKey, zoneKm], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---- things to do inside the zone ---------------------------------------------------------
  useEffect(() => { setSelected(null) }, [peopleKey, catKey])

  useEffect(() => {
    setTimes(null)
    if (!cat || !zone || !midpoint) { setFound([]); setPState('idle'); return }
    let stale = false
    setPState('loading'); setFound([])
    const ctl = new AbortController()
    const t = setTimeout(async () => {
      try {
        // zone bounding box, capped to ~±13 km around the centre so results stay close
        const cap = 0.12
        const box = {
          minLat: Math.max(Math.min(...zone.map(z => z.lat)), midpoint.lat - cap),
          maxLat: Math.min(Math.max(...zone.map(z => z.lat)), midpoint.lat + cap),
          minLng: Math.max(Math.min(...zone.map(z => z.lng)), midpoint.lng - cap),
          maxLng: Math.min(Math.max(...zone.map(z => z.lng)), midpoint.lng + cap),
        }
        const raw = await findPlaces(box, cat, ctl.signal)
        const seen = new Set<string>()
        const withD = raw
          .filter(p => pointInPolygon(p, zone) && !seen.has(p.name + p.lat.toFixed(3)) && seen.add(p.name + p.lat.toFixed(3)))
          .map(p => ({ p, d: people.map(x => distanceKm(x, p)) }))
        // keep a mix: the fairest overall, plus the closest overall (so "good for two of you" spots survive)
        const byMax = [...withD].sort((a, b) => Math.max(...a.d) - Math.max(...b.d)).slice(0, 14)
        const bySum = [...withD].sort((a, b) => a.d.reduce((x, y) => x + y, 0) - b.d.reduce((x, y) => x + y, 0)).slice(0, 10)
        const byPerson = people.flatMap((_, pi) => [...withD].sort((a, b) => a.d[pi] - b.d[pi]).slice(0, 3))
        const ranked = [...new Map([...byMax, ...bySum, ...byPerson].map(x => [x.p.id, x.p])).values()]
        if (stale) return
        setFound(ranked); setPState(ranked.length ? 'ok' : 'empty')
        if (ranked.length) getTimes(people, ranked).then(t => { if (!stale) setTimes(t) }).catch(() => {})
      } catch { if (!stale) setPState('error') }
    }, 600)
    return () => { stale = true; clearTimeout(t); ctl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catKey, peopleKey, retry])

  const tiers = useMemo(() => {
    if (!people.length || !found.length) return []
    const vals = found.map((place, i) => ({
      place,
      mins: people.map((p, pi) => times?.[pi]?.[i] ?? etaMinutes(distanceKm(p, place))),
      real: !!times,
    }))
    const best = Math.min(...vals.map(v => Math.max(...v.mins)))
    const budget = best * 1.2 + 2 // a drive counts as "fair" if it's close to the best anyone can get
    const scored = vals.map(v => ({ ...v, k: Math.max(1, v.mins.filter(m => m <= budget).length), worst: Math.max(...v.mins), budget }))
    const n = people.length
    const out: { k: number; rows: typeof scored }[] = []
    for (let k = n; k >= 1; k--) {
      const rows = scored.filter(v => v.k === k).sort((a, b) => a.worst - b.worst).slice(0, 8)
      if (rows.length) out.push({ k, rows })
    }
    return out
  }, [found, times, peopleKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const dimIds = useMemo(() => new Set(tiers.filter(t => t.k < people.length).flatMap(t => t.rows.map(r => r.place.id))), [tiers, people.length])
  const mapPlaces = useMemo(() => found.map(p => ({ ...p, dim: dimIds.has(p.id) })), [found, dimIds])

  // ---- real driving routes to the centre (or the chosen place) -------------------------------
  const target: LatLng | null = selected ?? (midpoint && people.length > 1 ? midpoint : null)
  const routeKey = target ? `${target.lat.toFixed(5)},${target.lng.toFixed(5)}|${peopleKey}` : ''
  useEffect(() => {
    setRoutes({})
    if (!target) return
    const ctl = new AbortController()
    const t = setTimeout(() => {
      people.forEach(p =>
        getRoute(p, target, ctl.signal)
          .then(r => setRoutes(prev => ({ ...prev, [p.id]: r })))
          .catch(() => { if (!ctl.signal.aborted) setRoutes(prev => ({ ...prev, [p.id]: 'err' })) }),
      )
    }, 400)
    return () => { clearTimeout(t); ctl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey])

  const live = people.map(p => (routes[p.id] && routes[p.id] !== 'err' ? (routes[p.id] as Route) : null))
  const etas = target ? people.map((p, i) => live[i]?.min ?? etaMinutes(distanceKm(p, target))) : []
  const allLive = live.length > 0 && live.every(Boolean)
  const gap = etas.length ? Math.max(...etas) - Math.min(...etas) : 0
  const routeLines = useMemo(
    () => people.flatMap((p, i) => (live[i] ? [{ id: p.id, color: p.color, line: live[i]!.line }] : [])),
    [routes, peopleKey], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ---- type-ahead suggestions ---------------------------------------------------------------
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || /^-?\d+(\.\d+)?\s*[, ]\s*-?\d+/.test(q)) { setSugg([]); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      suggestPlaces(q, midpoint ?? people[0] ?? null, ctl.signal)
        .then(r => { setSugg(r); setHi(-1) })
        .catch(() => {})
    }, 250)
    return () => { clearTimeout(t); ctl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function pick(s: Suggestion) {
    addPerson(s, s.title); setQuery(''); setSugg([])
  }

  function onKey(e: React.KeyboardEvent) {
    if (!sugg.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => (h + 1) % sugg.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => (h <= 0 ? sugg.length - 1 : h - 1)) }
    else if (e.key === 'Escape') setSugg([])
  }

  // ---- actions ------------------------------------------------------------------------------
  const addPerson = useCallback((p: LatLng, name?: string) => {
    setPlan(prev => {
      const id = Math.max(0, ...prev.people.map(x => x.id)) + 1
      const color = COLORS.find(c => !prev.people.some(x => x.color === c)) ?? COLORS[id % COLORS.length]
      return { ...prev, people: [...prev.people, { ...p, id, name: name || `Person ${prev.people.length + 1}`, color }] }
    })
    setFocus(p); setPicking(false)
  }, [])

  function useMyLocation() {
    if (!navigator.geolocation) return setToast('Location is not supported here')
    navigator.geolocation.getCurrentPosition(
      pos => addPerson({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'Me'),
      () => setToast('Couldn’t get your location — search or pick on the map'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    if (sugg.length) return pick(sugg[hi >= 0 ? hi : 0])
    const m = q.match(/^(-?\d+(\.\d+)?)\s*[, ]\s*(-?\d+(\.\d+)?)$/)
    if (m) { addPerson({ lat: +m[1], lng: +m[3] }); setQuery(''); return }
    try {
      const r = await searchPlace(q)
      if (!r) return setToast('Couldn’t find that place')
      addPerson(r, r.label.split(',')[0]); setQuery('')
    } catch { setToast('Search failed — try again') }
  }

  async function share() {
    const url = shareUrl(plan)
    try { await navigator.clipboard.writeText(url); setToast('Link copied — anyone with it sees this plan') }
    catch { prompt('Copy this link', url) }
  }

  function savePlan() {
    const title = plan.title.trim() || 'Untitled plan'
    const next = [{ id: String(Date.now()), savedAt: Date.now(), plan: { ...plan, title } }, ...saved].slice(0, 20)
    setSaved(next); storeSaved(next); patch({ title }); setToast('Saved to your plans')
  }
  const openSaved = (s: Saved) => { setPlan(s.plan); setFocus(s.plan.people[0] ?? null); setCatKey(null) }
  const deleteSaved = (id: string) => { const n = saved.filter(s => s.id !== id); setSaved(n); storeSaved(n) }
  const choose = (p: Place) => { setSelected(p); setFocus(p) }

  const maxEta = etas.length ? Math.max(...etas) : 0

  return (
    <div className="app">
      <MapView
        people={people} zone={zone} midpoint={midpoint}
        target={selected} routeLines={routeLines} places={mapPlaces} placeColor={cat?.color ?? '#ff9f0a'}
        picking={picking} focus={focus}
        onPick={p => addPerson(p)} onSelect={choose}
        onMove={(id, p) => setPlan(prev => ({ ...prev, people: prev.people.map(x => (x.id === id ? { ...x, ...p } : x)) }))}
      />

      <aside className={collapsed ? 'panel glass collapsed' : 'panel glass'}>
        <button className="grab" onClick={() => setCollapsed(c => !c)} aria-label="Expand or collapse" />
        <header>
          <a className="brand" href="#/"><span className="logo" /> MyPlans</a>
          <div className="actions">
            <button className="pill" onClick={savePlan}>Save</button>
            <button className="pill solid" onClick={share}>Share</button>
          </div>
        </header>

        <input className="title" value={plan.title} onChange={e => patch({ title: e.target.value })} placeholder="Name your plan" maxLength={60} />

        {people.length === 0 && (
          <div className="intro">
            <h2>Where is everyone starting from?</h2>
            <p>Add two or more places. We’ll highlight where you can all meet.</p>
            <button className="pill solid" onClick={() => { setPlan(examplePlan()); setFocus(null) }}>Try an example</button>
          </div>
        )}

        <div className="cap">Who’s coming</div>
        <div className="group">
          {people.map((p, i) => (
            <div className="item" key={p.id}>
              <span className="pin sm" style={{ background: p.color }}>{i + 1}</span>
              <input
                value={p.name}
                onChange={e => patch({ people: people.map(x => (x.id === p.id ? { ...x, name: e.target.value } : x)) })}
              />
              {target && people.length > 1 && (
                <span className={live[i] ? 'time' : 'time est'} title={live[i] ? `${live[i]!.km.toFixed(1)} km by road` : 'Estimate'}>
                  {live[i] ? '' : '~'}{fmtDuration(etas[i])}
                </span>
              )}
              <button className="x" title="Remove" onClick={() => patch({ people: people.filter(x => x.id !== p.id) })}>×</button>
            </div>
          ))}
          <form className="item add" onSubmit={onSearch}>
            <span className="plus">+</span>
            <input
              value={query} onChange={e => setQuery(e.target.value)} onKeyDown={onKey}
              placeholder="Add a place or address" autoComplete="off" role="combobox" aria-expanded={sugg.length > 0}
            />
          </form>
          {sugg.map((s, i) => (
            <button key={s.id} className={i === hi ? 'item sugg on' : 'item sugg'} onMouseEnter={() => setHi(i)} onMouseDown={e => { e.preventDefault(); pick(s) }}>
              <span className="plus">⌖</span>
              <span className="grow"><b>{s.title}</b><small>{s.subtitle}</small></span>
            </button>
          ))}
        </div>
        <div className="row">
          <button className="pill" onClick={useMyLocation}>📍 My location</button>
          <button className={picking ? 'pill solid' : 'pill'} onClick={() => setPicking(p => !p)}>
            {picking ? 'Tap the map…' : 'Pick on map'}
          </button>
        </div>

        {people.length === 1 && <p className="hint">Add one more person to see your meeting zone.</p>}

        {zone && target && (
          <>
            <div className="cap">Meeting zone</div>
            <div className="zone">
              <div className="zone-dot" />
              <div>
                <b>{selected ? selected.name : 'The middle of the zone'}</b>
                <span>
                  {allLive
                    ? maxEta <= 1 ? 'Everyone is right there' : `Everyone is within ${fmtDuration(maxEta)} by car${gap > 4 ? ` · ${fmtDuration(gap)} difference` : ' · a very even split'}`
                    : 'Finding drive times…'}
                </span>
              </div>
              {selected && <button className="link" onClick={() => setSelected(null)}>Reset</button>}
            </div>

            <div className="cap">What do you want to do here?</div>
            <div className="cats">
              {CATS.map(c => (
                <button key={c.key} className={c.key === catKey ? 'cat on' : 'cat'} onClick={() => setCatKey(k => (k === c.key ? null : c.key))}>
                  <span className="ico" style={{ background: c.color }}>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>

            {cat && (pState === 'loading' || pState === 'error' || pState === 'empty') && (
              <div className="group results">
                {pState === 'loading' && <div className="skeleton"><i /><i /><i /></div>}
                {pState === 'error' && <div className="note">Couldn’t load places. <button className="link" onClick={() => setRetry(r => r + 1)}>Try again</button></div>}
                {pState === 'empty' && <div className="note">No {cat.label.toLowerCase()} found inside the zone. Try another idea or move a pin.</div>}
              </div>
            )}
            {cat && tiers.map(t => (
              <section key={t.k} className="tier">
                <div className="tier-h">
                  <b>{t.k === people.length ? 'Fair for everyone' : `Better for ${t.k} of ${people.length}`}</b>
                  <span>{t.rows.length} {t.rows.length === 1 ? 'spot' : 'spots'}</span>
                </div>
                <div className="slider">
                  {t.rows.map((r, idx) => {
                    const far = people.filter((_, i) => r.mins[i] > r.budget).map(p => p.name)
                    return (
                      <button key={r.place.id} className={selected?.id === r.place.id ? 'pcard on' : 'pcard'} onClick={() => choose(r.place)}>
                        <div className="shot">
                          <MapShot lat={r.place.lat} lng={r.place.lng} />
                          <span className="ico sm" style={{ background: cat.color }}>{cat.emoji}</span>
                          {t.k === people.length && idx === 0 && tiers[0] === t && <span className="best">Best match</span>}
                        </div>
                        <div className="meta">
                          <b>{r.place.name}</b>
                          <small>{far.length ? `Longer for ${far.join(', ')}` : r.place.sub}</small>
                          <div className="chips">
                            {r.mins.map((m, i) => (
                              <span key={people[i].id}><i style={{ background: people[i].color }} />{r.real ? m : `~${m}`}</span>
                            ))}
                            <em>min</em>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
            {cat && pState === 'ok' && <p className="hint">Coloured numbers are each person’s drive time, with no live traffic. Tap a card to see everyone’s route.</p>}
          </>
        )}

        {saved.length > 0 && (
          <>
            <div className="cap">Your plans</div>
            <div className="group">
              {saved.map(s => (
                <div className="item" key={s.id}>
                  <button className="link grow" onClick={() => openSaved(s)}>
                    {s.plan.title}<small>{s.plan.people.length} people · {new Date(s.savedAt).toLocaleDateString()}</small>
                  </button>
                  <button className="x" onClick={() => deleteSaved(s.id)} title="Delete">×</button>
                </div>
              ))}
            </div>
          </>
        )}

        {people.length > 0 && (
          <button className="link reset" onClick={() => { setPlan(emptyPlan()); setCatKey(null) }}>Start a new plan</button>
        )}
      </aside>

      {toast && <div className="toast glass">{toast}</div>}
    </div>
  )
}
