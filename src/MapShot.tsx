type Props = { lat: number; lng: number; w?: number; h?: number; z?: number }

/** A small map snapshot centred on a point, stitched from OpenStreetMap tiles. */
export default function MapShot({ lat, lng, w = 232, h = 116, z = 16 }: Props) {
  const n = 2 ** z
  const tx = ((lng + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const ty = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  const x0 = Math.floor(tx - w / 512), y0 = Math.floor(ty - h / 512)
  const tiles = [0, 1].flatMap(dx => [0, 1].map(dy => ({ x: x0 + dx, y: y0 + dy })))
  return (
    <div className="shot-map" style={{ width: w, height: h }}>
      {tiles.map(t => (
        <img
          key={`${t.x}/${t.y}`} alt="" draggable={false} loading="lazy"
          src={`https://tile.openstreetmap.org/${z}/${t.x}/${t.y}.png`}
          style={{ left: (t.x - tx) * 256 + w / 2, top: (t.y - ty) * 256 + h / 2 }}
        />
      ))}
      <span className="shot-dot" />
    </div>
  )
}
