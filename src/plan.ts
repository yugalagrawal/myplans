import type { Person } from './MapView'

export type Plan = { title: string; people: Person[] }
export type Saved = { id: string; savedAt: number; plan: Plan }

export const COLORS = ['#0a84ff', '#ff375f', '#30d158', '#ff9f0a', '#bf5af2', '#40c8e0']

export const emptyPlan = (): Plan => ({ title: '', people: [] })

export const examplePlan = (): Plan => ({
  title: 'Bengaluru weekend plan',
  people: [
    { id: 1, name: 'Koramangala', lat: 12.9352, lng: 77.6245, color: COLORS[0] },
    { id: 2, name: 'Indiranagar', lat: 12.9784, lng: 77.6408, color: COLORS[1] },
    { id: 3, name: 'Whitefield', lat: 12.9698, lng: 77.75, color: COLORS[2] },
  ],
})

/** Fallback estimate while real routes load: straight line × 1.3 at 40 km/h. */
export const etaMinutes = (km: number) => Math.max(1, Math.round(((km * 1.3) / 40) * 60))

export function fmtDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

const KEY = 'myplans.current'
const SAVED = 'myplans.saved'

const enc = (p: Plan) =>
  btoa(unescape(encodeURIComponent(JSON.stringify({
    title: p.title,
    people: p.people.map(x => ({ ...x, lat: +x.lat.toFixed(5), lng: +x.lng.toFixed(5) })),
  }))))
const dec = (s: string): Plan => JSON.parse(decodeURIComponent(escape(atob(s))))

export const shareUrl = (p: Plan) => `${location.origin}${location.pathname}#/plan?p=${encodeURIComponent(enc(p))}`

const valid = (p: any): p is Plan => !!p && Array.isArray(p.people)

export function loadInitial(): Plan {
  try {
    const m = location.hash.match(/[?&]p=([^&]+)/)
    if (m) { const p = dec(decodeURIComponent(m[1])); if (valid(p)) return { title: p.title ?? '', people: p.people } }
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const p = JSON.parse(raw); if (valid(p)) return { title: p.title ?? '', people: p.people } }
  } catch { /* ignore */ }
  return emptyPlan()
}

export function persist(p: Plan) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ }
}
export function loadSaved(): Saved[] {
  try { return JSON.parse(localStorage.getItem(SAVED) || '[]') } catch { return [] }
}
export function storeSaved(s: Saved[]) {
  try { localStorage.setItem(SAVED, JSON.stringify(s)) } catch { /* ignore */ }
}
