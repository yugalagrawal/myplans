export type LatLng = { lat: number; lng: number }

const R = 6371

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Geographic centre of several points (average on the unit sphere). */
export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null
  let x = 0, y = 0, z = 0
  for (const p of points) {
    x += Math.cos(rad(p.lat)) * Math.cos(rad(p.lng))
    y += Math.cos(rad(p.lat)) * Math.sin(rad(p.lng))
    z += Math.sin(rad(p.lat))
  }
  x /= points.length; y /= points.length; z /= points.length
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lng: deg(Math.atan2(y, x)) }
}

type XY = { x: number; y: number }
const KM_DEG = 111.32

const project = (p: LatLng, o: LatLng): XY => ({
  x: (p.lng - o.lng) * Math.cos(rad(o.lat)) * KM_DEG,
  y: (p.lat - o.lat) * KM_DEG,
})
const unproject = (q: XY, o: LatLng): LatLng => ({
  lat: o.lat + q.y / KM_DEG,
  lng: o.lng + q.x / (KM_DEG * Math.cos(rad(o.lat))),
})

const circleXY = (c: XY, r: number, n = 72): XY[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) }
  })

const side = (a: XY, b: XY, p: XY) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)

function crossing(p: XY, q: XY, a: XY, b: XY): XY {
  const d1 = { x: q.x - p.x, y: q.y - p.y }
  const d2 = { x: b.x - a.x, y: b.y - a.y }
  const t = ((a.x - p.x) * d2.y - (a.y - p.y) * d2.x) / (d1.x * d2.y - d1.y * d2.x)
  return { x: p.x + d1.x * t, y: p.y + d1.y * t }
}

/** Sutherland–Hodgman: clip `subject` by a convex, counter-clockwise polygon. */
function clip(subject: XY[], by: XY[]): XY[] {
  let out = subject
  for (let i = 0; i < by.length && out.length; i++) {
    const a = by[i], b = by[(i + 1) % by.length]
    const input = out
    out = []
    for (let j = 0; j < input.length; j++) {
      const cur = input[j], prev = input[(j + input.length - 1) % input.length]
      const curIn = side(a, b, cur) >= 0, prevIn = side(a, b, prev) >= 0
      if (curIn) {
        if (!prevIn) out.push(crossing(prev, cur, a, b))
        out.push(cur)
      } else if (prevIn) out.push(crossing(prev, cur, a, b))
    }
  }
  return out
}

/** The area that lies within `radiusKm` of every point: the overlap of all their circles. */
export function intersectionZone(points: LatLng[], radiusKm: number): LatLng[] | null {
  const o = centroid(points)
  if (!o || points.length < 2) return null
  const xy = points.map(p => project(p, o))
  let poly = circleXY(xy[0], radiusKm)
  for (const c of xy.slice(1)) poly = clip(poly, circleXY(c, radiusKm))
  return poly.length > 2 ? poly.map(q => unproject(q, o)) : null
}

export function pointInPolygon(p: LatLng, poly: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) inside = !inside
  }
  return inside
}
