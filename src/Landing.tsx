import { useEffect } from 'react'

const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

function HeroArt() {
  return (
    <svg viewBox="0 0 720 460" className="art" role="img" aria-label="Three circles overlapping to show a shared meeting zone">
      <defs>
        <clipPath id="a"><circle cx="270" cy="210" r="150" /></clipPath>
        <clipPath id="b"><circle cx="450" cy="210" r="150" /></clipPath>
        <clipPath id="c"><circle cx="360" cy="320" r="150" /></clipPath>
      </defs>
      <rect width="720" height="460" className="art-bg" />
      <rect x="40" y="300" width="130" height="90" rx="18" className="art-park" />
      <rect x="560" y="40" width="120" height="80" rx="18" className="art-water" />
      <g className="art-road" fill="none" strokeLinecap="round">
        <path d="M-10 120 C160 150 300 60 460 110 S680 150 740 90" strokeWidth="14" />
        <path d="M130 -10 C170 140 120 300 190 470" strokeWidth="12" />
        <path d="M-10 380 C200 340 420 440 740 360" strokeWidth="12" />
        <path d="M560 -10 C520 160 600 280 540 470" strokeWidth="10" />
        <path d="M-10 250 L740 230" strokeWidth="6" />
      </g>
      <g fill="none" strokeWidth="2.5" strokeDasharray="4 8">
        <circle cx="270" cy="210" r="150" stroke="#0a84ff" />
        <circle cx="450" cy="210" r="150" stroke="#ff375f" />
        <circle cx="360" cy="320" r="150" stroke="#30d158" />
      </g>
      <g clipPath="url(#a)"><g clipPath="url(#b)"><circle className="zone-fill" cx="360" cy="320" r="150" /></g></g>
      <g clipPath="url(#b)"><g clipPath="url(#c)"><circle className="zone-fill" cx="270" cy="210" r="150" /></g></g>
      <g clipPath="url(#a)"><g clipPath="url(#c)"><circle className="zone-fill" cx="450" cy="210" r="150" /></g></g>
      <circle cx="360" cy="248" r="9" fill="#fff" stroke="#0a84ff" strokeWidth="4" className="pulse" />
      {[[270, 210, '#0a84ff', 1], [450, 210, '#ff375f', 2], [360, 320, '#30d158', 3]].map(([x, y, c, n]) => (
        <g key={n as number}>
          <circle cx={x as number} cy={y as number} r="17" fill={c as string} stroke="#fff" strokeWidth="4" />
          <text x={x as number} y={(y as number) + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">{n}</text>
        </g>
      ))}
    </svg>
  )
}

const FEATURES = [
  { icon: '◎', title: 'A fair meeting zone', body: 'We map how far everyone can reasonably go and highlight exactly where those areas overlap. No more “I’ll just come to you” every single time.' },
  { icon: '🚗', title: 'Real drive times', body: 'See actual road routes and how long each person drives, so the split is genuinely even, not just close on the map.' },
  { icon: '✨', title: 'Know what to do', body: 'Restaurants, movies, walks, games and more. Discover places inside the zone, ranked by how fair they are for the whole group.' },
]

const STEPS = [
  { n: '1', title: 'Add everyone', body: 'Type a place, use your location, or drop a pin on the map. Add as many people as you like.' },
  { n: '2', title: 'See your zone', body: 'The area everyone can reach lights up. Drag a pin and watch it update instantly.' },
  { n: '3', title: 'Pick a plan', body: 'Choose dinner, a film or a walk. Tap a place to see every route, then share the link.' },
]

const AUDIENCES = [
  { emoji: '👯', title: 'Friends & family', body: 'Weekend catch-ups without the endless group-chat maths.' },
  { emoji: '💼', title: 'Teams & offsites', body: 'Pick a neutral spot that keeps everyone’s total travel low.' },
  { emoji: '🤝', title: 'Client & candidate meets', body: 'Choose a venue that’s fair and professional for both sides.' },
  { emoji: '💛', title: 'First dates', body: 'A comfortable middle ground, so nobody’s doing the long drive.' },
]

const IDEAS = ['🍽️ Restaurants', '☕ Cafés', '🎬 Movies', '🌳 Walks & parks', '🎳 Fun & games', '🍸 Bars & nightlife', '🛍️ Shopping', '🖼️ Museums & art']

export default function Landing() {
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.15 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="site">
      <nav className="nav glass">
        <div className="wrap nav-in">
          <a className="brand" href="#/"><span className="logo" /> MyPlans</a>
          <div className="nav-links">
            <button onClick={() => jump('why')}>Why MyPlans</button>
            <button onClick={() => jump('how')}>How it works</button>
            <button onClick={() => jump('who')}>Who it’s for</button>
          </div>
          <a className="pill solid" href="#/plan">Start planning</a>
        </div>
      </nav>

      <header className="hero wrap">
        <p className="eyebrow">Meet in the middle</p>
        <h1>The easiest way to <span className="grad">meet halfway.</span></h1>
        <p className="lede">Add where everyone is. MyPlans finds the fair zone you can all drive to, and shows you what to do once you get there.</p>
        <div className="cta">
          <a className="pill solid big" href="#/plan">Start planning</a>
          <button className="link big" onClick={() => jump('how')}>See how it works ›</button>
        </div>
        <div className="stage reveal">
          <HeroArt />
          <div className="float f1 glass"><small>Meeting zone</small><b>Everyone within 14 min</b></div>
          <div className="float f2 glass"><span className="ico" style={{ background: '#ff375f' }}>🎬</span><div><b>Movies in the zone</b><small>3 cinemas · 11 · 13 · 12 min</small></div></div>
        </div>
      </header>

      <section id="why" className="band wrap">
        <h2 className="reveal">Planning together, <span className="muted">without the compromise.</span></h2>
        <div className="grid3">
          {FEATURES.map(f => (
            <article key={f.title} className="card reveal">
              <div className="badge-ico">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="band alt">
        <div className="wrap">
          <h2 className="reveal">Three taps to a plan.</h2>
          <div className="steps">
            {STEPS.map(s => (
              <div key={s.n} className="step reveal">
                <span className="big-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band wrap">
        <h2 className="reveal">Then, the fun part. <span className="muted">What shall we do?</span></h2>
        <div className="ideas reveal">{IDEAS.map(i => <span key={i} className="idea">{i}</span>)}</div>
      </section>

      <section id="who" className="band alt">
        <div className="wrap">
          <h2 className="reveal">Less travel. Less coordination. <span className="muted">More time together.</span></h2>
          <p className="sub reveal">For teams, every meeting in the right place means less time on the road and fewer messages to agree on it. For everyone else, it just means fewer arguments about who drives.</p>
          <div className="grid4">
            {AUDIENCES.map(a => (
              <article key={a.title} className="card tight reveal">
                <div className="emoji">{a.emoji}</div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="final wrap">
        <div className="final-card reveal">
          <h2>Your next plan, planned in a minute.</h2>
          <p>Free to use. No sign-up. Your plans stay on your device.</p>
          <a className="pill big white" href="#/plan">Start planning</a>
        </div>
      </section>

      <footer className="foot wrap">
        <span>© {new Date().getFullYear()} MyPlans</span>
        <span>Map data © OpenStreetMap contributors · Routing by OSRM</span>
      </footer>
    </div>
  )
}
