import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from './geo'
import type { Place } from './api'

export type Person = LatLng & { id: number; name: string; color: string }

type Props = {
  people: Person[]
  zone: LatLng[] | null
  midpoint: LatLng | null
  target: Place | null
  routeLines: { id: number; color: string; line: [number, number][] }[]
  places: Place[]
  placeColor: string
  picking: boolean
  focus: LatLng | null
  onPick: (p: LatLng) => void
  onMove: (id: number, p: LatLng) => void
  onSelect: (p: Place) => void
}

const ACCENT = '#0a84ff'

const dot = (cls: string, color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div class="pin ${cls}" style="background:${color}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

export default function MapView(props: Props) {
  const { people, zone, midpoint, target, routeLines, places, placeColor, picking, focus } = props
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const cb = useRef(props)
  cb.current = props

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: false }).setView([20.59, 78.96], 5)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'base-tiles', attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)
    m.on('click', e => cb.current.picking && cb.current.onPick({ lat: e.latlng.lat, lng: e.latlng.lng }))
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => { m.remove() }
  }, [])

  useEffect(() => {
    map.current!.getContainer().style.cursor = picking ? 'crosshair' : ''
  }, [picking])

  useEffect(() => {
    if (focus) map.current!.setView([focus.lat, focus.lng], Math.max(map.current!.getZoom(), 13))
  }, [focus])

  // Refit when people are added/removed, not while dragging.
  useEffect(() => {
    if (!people.length) return
    const b = L.latLngBounds(people.map(p => [p.lat, p.lng] as [number, number]))
    zone?.forEach(z => b.extend([z.lat, z.lng]))
    const wide = window.innerWidth > 760
    map.current!.fitBounds(b, {
      maxZoom: 13,
      ...(wide
        ? { paddingTopLeft: [460, 60] as [number, number], paddingBottomRight: [60, 60] as [number, number] }
        : { paddingTopLeft: [30, 60] as [number, number], paddingBottomRight: [30, window.innerHeight * 0.55] as [number, number] }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.length, !!zone])

  useEffect(() => {
    const g = layer.current!
    g.clearLayers()
    if (zone && people.length > 1) {
      // spotlight: dim everything outside the meeting zone, then outline the zone with a soft glow
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const world: [number, number][] = [[-85, -180], [-85, 180], [85, 180], [85, -180]]
      const hole = zone.map(z => [z.lat, z.lng] as [number, number])
      L.polygon([world, hole], {
        stroke: false, fillColor: dark ? '#000' : '#fff', fillOpacity: dark ? 0.5 : 0.5, interactive: false,
      }).addTo(g)
      L.polygon(zone, { color: ACCENT, weight: 12, opacity: 0.16, fill: false, interactive: false, lineJoin: 'round' }).addTo(g)
      L.polygon(zone, { color: ACCENT, weight: 2.5, fillColor: ACCENT, fillOpacity: 0.1, interactive: false, lineJoin: 'round' }).addTo(g)
    }
    routeLines.forEach(r => {
      L.polyline(r.line, { color: '#fff', weight: 9, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g)
      L.polyline(r.line, { color: r.color, weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g)
    })
    if (midpoint && people.length > 1) L.marker(midpoint, { icon: dot('mid', '#fff', '') }).bindTooltip('Centre point').addTo(g)
    places.filter(p => p.id !== target?.id).forEach(p =>
      L.circleMarker(p, { radius: p.dim ? 6 : 9, color: '#fff', weight: 2.5, fillColor: placeColor, fillOpacity: p.dim ? 0.55 : 1 })
        .bindTooltip(p.name)
        .on('click', () => cb.current.onSelect(p))
        .addTo(g),
    )
    if (target) L.marker(target, { icon: dot('sel', placeColor, '★') }).bindTooltip(target.name).addTo(g)
    people.forEach((p, i) => {
      L.marker(p, { icon: dot('', p.color, String(i + 1)), draggable: true })
        .bindTooltip(p.name)
        .on('dragend', e => {
          const ll = (e.target as L.Marker).getLatLng()
          cb.current.onMove(p.id, { lat: ll.lat, lng: ll.lng })
        })
        .addTo(g)
    })
  }, [people, zone, midpoint, target, routeLines, places, placeColor])

  return <div ref={el} className="map" />
}
