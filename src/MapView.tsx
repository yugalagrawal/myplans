import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLng } from './geo'
import type { Place } from './api'

export type Person = LatLng & { id: number; name: string; color: string }

type Props = {
  people: Person[]
  zone: LatLng[] | null
  zoneKm: number
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
  const { people, zone, zoneKm, midpoint, target, routeLines, places, placeColor, picking, focus } = props
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const cb = useRef(props)
  const refit = useRef<() => void>(() => {})
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
    const ro = new ResizeObserver(() => { m.invalidateSize(); refit.current() })
    ro.observe(el.current!)
    return () => { ro.disconnect(); m.remove() }
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
    const fit = () => {
      const b = L.latLngBounds(people.map(p => [p.lat, p.lng] as [number, number]))
      if (zoneKm) people.forEach(p => b.extend(L.latLng(p).toBounds(zoneKm * 2000)))
      map.current!.fitBounds(b, { maxZoom: 13, padding: [30, 30], animate: false })
    }
    refit.current = fit // also re-run whenever the map's size changes (e.g. the results dock opens)
    fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people.length, !!zone])

  useEffect(() => {
    const g = layer.current!
    g.clearLayers()
    if (zone && people.length > 1) {
      // one soft circle per person, then the overlap of all of them in blue
      people.forEach(p =>
        L.circle(p, { radius: zoneKm * 1000, color: p.color, weight: 2, opacity: 0.85, fillColor: p.color, fillOpacity: 0.1, interactive: false }).addTo(g),
      )
      L.polygon(zone, { color: ACCENT, weight: 3, fillColor: ACCENT, fillOpacity: 0.38, interactive: false, lineJoin: 'round' }).addTo(g)
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
  }, [people, zone, zoneKm, midpoint, target, routeLines, places, placeColor])

  return <div ref={el} className="map" />
}
