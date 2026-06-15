'use client';

const VALUES = [
  ['🐜', 'Deliberate Craftsmanship', 'Every itinerary is built with care. We do not use templates. We listen, design, refine — and deliver something made for that person.'],
  ['🌱', 'Local Rootedness', 'We are Vietnamese and proud. Our guides are storytellers. Our routes go where maps end — where Vietnam truly begins.'],
  ['🤝', 'Quiet Integrity', 'We charge fairly, pay our partners fairly, and tell our clients the truth. Our reputation is our most valuable asset.'],
  ['✨', 'Understated Luxury', 'Luxury is the detail someone notices because we cared enough to include it. A note in the room. A guide who remembers your coffee.'],
  ['📈', 'Ambitious Growth', '$10M in 10 years. 50 staff. Laos & Cambodia. But growth that never costs us our soul — it funds it.'],
  ['💚', 'Responsible Travel', 'We choose suppliers who treat their staff well. We minimise waste. We support communities directly.'],
];

export default function Culture() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🎯 Mission</span>
          </div>
          <div className="card-body">
            <div className="info-bar" style={{ fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.7 }}>
              To design journeys that move people — not just across Vietnam, but into it. We exist to create the kind of travel that changes how someone sees the world.
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🔭 Vision</span>
          </div>
          <div className="card-body">
            <div className="info-bar culture-vision-bar">
              To become the most trusted boutique inbound operator in Indochina — known not for scale, but for the depth of every experience we create.
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd">
          <span className="card-title">🧭 Core Values</span>
        </div>
        <div className="card-body">
          <div className="culture-values-grid">
            {VALUES.map(([icon, title, body]) => (
              <div key={title} className="culture-value-card">
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div className="culture-value-title">{title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">🎨 Brand Voice</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="culture-voice-label culture-voice-yes">We are:</div>
              <div className="culture-voice-list">
                <div>✓ Warm but not effusive</div>
                <div>✓ Confident but never arrogant</div>
                <div>✓ Poetic but precise</div>
                <div>✓ Locally rooted, globally articulate</div>
                <div>✓ Second person (&quot;you&quot;, &quot;your journey&quot;)</div>
              </div>
            </div>
            <div>
              <div className="culture-voice-label culture-voice-no">We never:</div>
              <div className="culture-voice-list">
                <div>✗ Use clichés (&quot;hidden gems&quot;, &quot;off the beaten track&quot;)</div>
                <div>✗ Oversell or over-promise</div>
                <div>✗ Use excessive exclamation marks</div>
                <div>✗ Write generic copy</div>
                <div>✗ Forget the client is the hero</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
