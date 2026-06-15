'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function About() {
  const [tagline, setTagline] = useState(
    'We move like ants — small, deliberate, and deeply connected to the ground beneath our feet. Our tours are not itineraries; they are quiet conversations between travellers and a country that rewards those who listen.'
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="about-hero">
            <div className="about-hero-title">The Ant Adventures</div>
            <div className="about-hero-sub">Boutique Inbound Tour Operator · Vietnam</div>
            <div className="about-hero-tagline">{tagline}</div>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 13, lineHeight: 1.85 }}>
              <p style={{ marginBottom: 14 }}>
                Founded with a belief that Vietnam deserves to be experienced slowly, The Ant Adventures is a boutique inbound tour operator specialising in bespoke journeys across Vietnam, with planned expansion into Laos and Cambodia.
              </p>
              <p style={{ marginBottom: 14 }}>
                We serve discerning international travellers — primarily from the USA, Australia, France, the UK and Germany — who seek depth over distance, connection over convenience, and stories over statistics.
              </p>
              <p>Our target is to grow to a $10M revenue operation within 10 years, with a team of 50 staff, while maintaining the intimate, handcrafted quality that defines every journey we design.</p>
            </div>
            <div className="divider" style={{ height: 1, background: 'var(--b)', margin: '16px 0' }} />
            <Link href="/culture" className="btn btn-s btn-sm">
              🌿 View Culture & Values →
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Company Facts</span>
            </div>
            <div className="card-body about-facts">
              {[
                ['Founded', '2024'],
                ['HQ', 'Ho Chi Minh City'],
                ['Email', 'taipham@theantadventures.com'],
                ['Markets', 'USA, AUS, FR, UK, DE'],
                ['10Y Revenue Target', '$10M'],
                ['Team Target (Yr10)', '50 staff'],
              ].map(([k, v]) => (
                <div key={k} className="about-fact-row">
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Brand Color</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 8, background: '#2E7D52' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>#2E7D52</div>
                <div style={{ fontSize: 11.5, color: 'var(--m)' }}>Ant Green · RGB(46,125,82)</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Quick Edit</span>
            </div>
            <div className="card-body" style={{ padding: 14 }}>
              <div className="fg">
                <label className="lbl">Tagline</label>
                <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <button className="btn btn-p btn-sm" type="button" style={{ marginTop: 8 }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">10-Year Growth Roadmap</span>
        </div>
        <div className="card-body">
          <div className="about-roadmap">
            <div className="about-roadmap-phase about-roadmap-foundation">
              <div className="about-roadmap-label">Year 1–3 · Foundation</div>
              <div>• Build Vietnam operations (N/C/S)<br />• 20+ tour products<br />• Reach $500K revenue<br />• Team: 5–10 staff</div>
            </div>
            <div className="about-roadmap-phase about-roadmap-scaling">
              <div className="about-roadmap-label">Year 4–7 · Scaling</div>
              <div>• Expand Laos & Cambodia<br />• $3M–5M revenue<br />• B2B agent network<br />• Team: 20–30 staff</div>
            </div>
            <div className="about-roadmap-phase about-roadmap-mastery">
              <div className="about-roadmap-label">Year 8–10 · Mastery</div>
              <div>• $10M revenue<br />• Team of 50<br />• UHNW signature line<br />• Industry awards</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
