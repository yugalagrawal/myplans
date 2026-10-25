import type { Person } from './MapView'
import type { Place } from './api'
import { fmtDuration } from './plan'

type Props = {
  place: Place
  people: Person[]
  /** drive minutes per person to this place */
  mins: number[]
  /** false while times are still estimates */
  exact: boolean
  onClose: () => void
  onToast: (msg: string) => void
}

export default function PlaceShare({ place, people, mins, exact, onClose, onToast }: Props) {
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  const times = people.length > 1
    ? people.map((p, i) => `${p.name} ${exact ? '' : '~'}${fmtDuration(mins[i])}`).join(' · ')
    : ''
  const text = [
    `📍 Let's meet at ${place.name}${place.sub && place.id !== 'check' ? ` (${place.sub})` : ''}`,
    times && `Drive times: ${times}`,
    `Directions: ${directions}`,
    'Planned with MyPlans',
  ].filter(Boolean).join('\n')

  async function copy() {
    try { await navigator.clipboard.writeText(text); onToast('Copied — paste it anywhere') }
    catch { prompt('Copy this message', text) }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: place.name, text }); return } catch { return } // user closed the sheet
    }
    copy()
  }

  return (
    <div className="placebar glass">
      <div className="pb-info">
        <b>{place.name}</b>
        <small>{place.sub || 'Selected place'}</small>
      </div>
      <div className="pb-actions">
        <button className="pill solid" onClick={share}>Share</button>
        <a className="pill" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>WhatsApp</a>
        <button className="pill" onClick={copy}>Copy</button>
        <a className="pill" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}>Maps</a>
        <button className="x" onClick={onClose} aria-label="Close">×</button>
      </div>
    </div>
  )
}
