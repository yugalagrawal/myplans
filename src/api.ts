import type { LatLng } from './geo'
import type { Cat } from './categories'

export type Place = LatLng & { id: string; name: string; sub: string; dim?: boolean }
export type Route = { km: number; min: number; line: [number, number][] }

export async function searchPlace(q: string): Promise<(LatLng & { label: string }) | null> {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q)
  const r = await (await fetch(url)).json()
  if (!r.length) return null
  return { lat: +r[0].lat, lng: +r[0].lon, label: r[0].display_name as string }
}

export type Box = { minLat: number; maxLat: number; minLng: number; maxLng: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Named places of one category inside `box` (OpenStreetMap data via Nominatim; polite 1 request/second). */
export async function findPlaces(box: Box, cat: Cat, signal?: AbortSignal): Promise<Place[]> {
  const out = new Map<string, Place>()
  for (let i = 0; i < cat.terms.length; i++) {
    if (i) await sleep(1100)
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&bounded=1&addressdetails=0' +
      `&viewbox=${box.minLng},${box.maxLat},${box.maxLng},${box.minLat}&q=${encodeURIComponent(cat.terms[i])}`
    const r = await fetch(url, { signal })
    if (!r.ok) throw new Error('Place lookup failed')
    for (const x of (await r.json()) as any[]) {
      if (!cat.types.includes(`${x.category}:${x.type}`)) continue
      const id = `${x.osm_type}${x.osm_id}`
      out.set(id, {
        id, lat: +x.lat, lng: +x.lon,
        name: (x.name || x.display_name.split(',')[0]) as string,
        sub: (x.type as string).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
      })
    }
  }
  return [...out.values()]
}

const ROUTER = 'https://routing.openstreetmap.de/routed-car'

/** Real driving route (OSRM, no live traffic). */
export async function getRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route> {
  const r = await fetch(`${ROUTER}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`, { signal })
  if (!r.ok) throw new Error('Routing failed')
  const route = (await r.json()).routes?.[0]
  if (!route) throw new Error('No route')
  return {
    km: route.distance / 1000,
    min: Math.max(1, Math.round(route.duration / 60)),
    line: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
  }
}

/** Drive minutes from every person to every place in one call: result[person][place]. */
export async function getTimes(people: LatLng[], places: LatLng[]): Promise<(number | null)[][]> {
  const coords = [...people, ...places].map(p => `${p.lng},${p.lat}`).join(';')
  const src = people.map((_, i) => i).join(';')
  const dst = places.map((_, i) => people.length + i).join(';')
  const r = await fetch(`${ROUTER}/table/v1/driving/${coords}?sources=${src}&destinations=${dst}`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error('Table failed')
  const d = await r.json()
  return (d.durations as (number | null)[][]).map(row => row.map(s => (s == null ? null : Math.max(1, Math.round(s / 60)))))
}

export type Suggestion = LatLng & { id: string; title: string; subtitle: string }

/** Type-ahead place suggestions (Photon, built for autocomplete on OpenStreetMap data). */
export async function suggestPlaces(q: string, bias: LatLng | null, signal?: AbortSignal): Promise<Suggestion[]> {
  const near = bias ? `&lat=${bias.lat}&lon=${bias.lng}` : ''
  const r = await fetch(`https://photon.komoot.io/api/?limit=6&q=${encodeURIComponent(q)}${near}`, { signal })
  if (!r.ok) throw new Error('Suggest failed')
  const seen = new Set<string>()
  return ((await r.json()).features as any[]).flatMap(f => {
    const p = f.properties
    const title: string = p.name ?? p.street ?? p.city
    if (!title) return []
    const subtitle = [p.street && p.street !== title ? p.street : null, p.district, p.city !== title ? p.city : null, p.state, p.country]
      .filter(Boolean).join(', ')
    const key = title + subtitle
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: `${p.osm_type}${p.osm_id}`, title, subtitle, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }]
  })
}
