import { useEffect, useState } from 'react'
import Landing from './Landing'
import Planner from './Planner'
import './index.css'

export default function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => { setHash(location.hash); window.scrollTo(0, 0) }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return hash.startsWith('#/plan') ? <Planner /> : <Landing />
}
