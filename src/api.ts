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

// OSM keys that are never "places to go" — used to clean up free-text searches.
const NOT_PLACES = new Set(['highway', 'landuse', 'building', 'place', 'boundary', 'route', 'railway', 'waterway', 'natural'])

/** Named places for an activity inside `box`, biased towards `centre` (OpenStreetMap data via Photon). */
export async function findPlaces(box: Box, centre: LatLng, cat: Cat, signal?: AbortSignal): Promise<Place[]> {
  const runs = await Promise.all(
    cat.queries.map(async ({ q, tag }) => {
      const url =
        `https://photon.komoot.io/api/?limit=40&lang=en&bbox=${box.minLng},${box.minLat},${box.maxLng},${box.maxLat}` +
        `&lat=${centre.lat}&lon=${centre.lng}&q=${encodeURIComponent(q)}${tag ? `&osm_tag=${encodeURIComponent(tag)}` : ''}`
      const r = await fetch(url, { signal })
      if (!r.ok) throw new Error('Place lookup failed')
      return ((await r.json()).features ?? []) as any[]
    }),
  )
  const out = new Map<string, Place>()
  for (const f of runs.flat()) {
    const p = f.properties
    if (!p.name || (!cat.queries[0].tag && NOT_PLACES.has(p.osm_key))) continue
    const id = `${p.osm_type}${p.osm_id}`
    const kind = ((p.osm_value as string) || cat.label).replace(/_/g, ' ').replace(/^./, ch => ch.toUpperCase())
    const area = p.district || p.suburb || p.city
    out.set(id, { id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: p.name as string, sub: area ? `${kind} · ${area}` : kind })
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

/** Type-ahead place suggestions (Photon, built for autocomplete on OpenStreetMap data). Nearby matches first. */
export async function suggestPlaces(q: string, bias: LatLng | null, signal?: AbortSignal): Promise<Suggestion[]> {
  const base = `https://photon.komoot.io/api/?limit=6&lang=en&q=${encodeURIComponent(q)}`
  const get = async (extra: string) => {
    const r = await fetch(base + extra, { signal })
    if (!r.ok) throw new Error('Suggest failed')
    return (await r.json()).features as any[]
  }
  // matches within ~130 km of the group first; widen to the whole world only if there are few
  const d = 1.2
  let features = bias ? await get(`&bbox=${bias.lng - d},${bias.lat - d},${bias.lng + d},${bias.lat + d}`) : []
  if (features.length < 4) features = [...features, ...(await get(''))]
  const seen = new Set<string>()
  return features.flatMap(f => {
    const p = f.properties
    const title: string = p.name ?? p.street ?? p.city
    if (!title) return []
    const subtitle = [p.street && p.street !== title ? p.street : null, p.district, p.city !== title ? p.city : null, p.state, p.country]
      .filter(Boolean).join(', ')
    const key = `${p.osm_type}${p.osm_id}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: key, title, subtitle, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }]
  }).slice(0, 7)
}

/** A short human label for a point ("Marathahalli, Bengaluru"), via Photon reverse geocoding. */
export async function nameForPoint(c: LatLng, signal?: AbortSignal): Promise<string> {
  const r = await fetch(`https://photon.komoot.io/reverse?lat=${c.lat}&lon=${c.lng}&lang=en`, { signal })
  if (!r.ok) throw new Error('Reverse failed')
  const p = (await r.json()).features?.[0]?.properties
  if (!p) return ''
  return [p.name ?? p.street, p.district ?? p.suburb, p.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ')
}
