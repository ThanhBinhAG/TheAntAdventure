'use client';

import { useEffect, useState } from 'react';

const LS_KEY = 'ant-ai-requirements';

type AIForm = {
  rules: string;
  suppliers: string;
  pricing: string;
  design: string;
  voice: string;
  extra: string;
  lastSaved: string | null;
};

const TEMPLATES: Record<string, Partial<AIForm>> = {
  standard: {
    rules: 'Route full Vietnam tours: Hanoi → Halong Bay → Ninh Binh → Hue (flight HAN→HUI Day 5) → Hoi An/Da Nang → Saigon (flight DAD→SGN Day 9) → Mekong Delta. Maximum 2 internal flights per tour. Minimum 1 night per destination.',
    suppliers: 'Default hotels: La Siesta Ma May Hanoi (Hanoi), Bhaya Cruise (Halong), Ninh Binh Hidden Charm (Ninh Binh), Medallion Hue (Hue), Allegro Hoi An (Hoi An), La Siesta Premium Saigon (HCMC), Charmant Suite (Can Tho). Always offer Bhaya for Halong segments.',
    pricing: 'Minimum markup 25%. Luxury tier floor: $2,000/pax. B2B commission: Bronze 8%, Silver 12%, Gold/Virtuoso 15%, Platinum/A&K 20%. All UHNW quotes in USD. Seasonal surcharge: Tet +15%, Peak Oct-Nov +10%.',
    design: 'Max 4 destinations per 7 days. 1 culinary experience per 3 days minimum. All luxury tours include private vehicle. No shared transportation for UHNW clients. Always include sunrise or sunset experience.',
    voice: 'Second person narrative. Sensory and unhurried tone. Avoid: hidden gem, off the beaten track, authentic, unique. Open with the moment: "The morning light lifts off the water...". Sign off from Tai personally.',
  },
  uhnw: {
    rules: 'UHNW protocols: All transport private helicopter/speedboat where available. Maximum 8 pax. Dedicated private guide mandatory. Pre-arrival site inspection by guide. 24/7 concierge WhatsApp line.',
    suppliers: 'UHNW tier only: Six Senses, Anantara, Aman properties. Private chartered vessels only. Specialist chefs, historians, veterans available on request. All suppliers must have luxury certification.',
    pricing: 'UHNW floor: $8,000/pax. No commission discounts on UHNW tier. Custom pricing only — no standard rate cards. Include 15% service fee on all supplier costs.',
    design: 'No group activities. All experiences private and exclusive. Custom-built experiences preferred over standard products. Include at least one unrepeatable moment per tour.',
    voice: 'Ultra-discreet. Never reference price unless asked. Lead with experience, never logistics. Reference the client by name throughout the proposal.',
  },
  family: {
    rules: 'Family rules: Check child ages before confirming activities. No activities rated challenging for children under 12. All hotels must have family rooms or adjoining rooms. Confirm pool availability.',
    suppliers: 'Family-friendly hotels with kids clubs preferred. Restaurants must accommodate dietary restrictions and allergies. All guides must have experience with children.',
    pricing: 'Children 0-2: Free. Children 3-11: 50% of adult rate. Teens 12-17: 75% of adult rate. Family discount on groups of 4+ with 2+ children: 5% off total.',
    design: 'Max activity duration 3 hours for families with under-10s. Include 1 child-specific activity per day. Balance education with fun. Always include cooking class and animal encounter if available.',
    voice: 'Warm and inclusive. Address both parents and mention the children by name/age if known. Highlight what the children will love, not just the parents.',
  },
  b2b: {
    rules: 'B2B agent rules: Always include net rates and recommended sell rates separately. Provide full margin calculations. Offer commission structure options upfront. Turnaround: quotes within 24 hours.',
    suppliers: 'Include full supplier cost breakdown for agent transparency. Mark non-negotiable supplier costs clearly. Flag any supplier exclusivity agreements.',
    pricing: 'Provide both NET price and SELL price in all quotes. Commission tiers apply automatically. Include overriding instructions for different agent tiers.',
    design: 'Modular design preferred for B2B — agents can add/remove days easily. Include optional extensions and upgrades. Clearly label what is flexible vs fixed.',
    voice: 'Professional and efficient for agent communications. Include all operational details agents need. Provide marketing copy separately from operational notes.',
  },
};

const WRITING_TIPS = [
  { label: 'Business Rules', hint: 'e.g. Always route full-route tours through HAN→HUI (Day 5) and DAD→SGN (Day 9). Never book clients in Hue during October typhoon season without explicit client acknowledgement.' },
  { label: 'Supplier Logic', hint: 'e.g. Default hotel roster: La Siesta Ma May Hanoi, Bhaya Cruise Halong, Medallion Hue, Allegro Hoi An, La Siesta Premium Saigon, Charmant Suite Can Tho.' },
  { label: 'Pricing Rules', hint: 'e.g. Minimum markup 25%. B2B agents: Bronze 8%, Silver 12%, Gold/Virtuoso 15%, Platinum/Abercrombie 20%. Never quote below $1,800/pax for luxury tier.' },
  { label: 'Tour Design', hint: 'e.g. Max 2 internal flights per tour. No more than 4 destinations for tours under 10 days. Always include 1 culinary experience per 3 days.' },
  { label: 'Brand Voice', hint: 'e.g. Use second-person narrative. Avoid: "hidden gem", "off the beaten track", "authentic". Preferred openers: "Your journey begins...", "The morning light reveals...".' },
];

const EMPTY: AIForm = { rules: '', suppliers: '', pricing: '', design: '', voice: '', extra: '', lastSaved: null };

function statusLabel(val: string) {
  return val.trim() ? '✓ Set' : '— Empty';
}

export default function AI() {
  const [form, setForm] = useState<AIForm>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setForm(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const set = (key: keyof AIForm, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const save = () => {
    const next = { ...form, lastSaved: new Date().toLocaleString('en-GB') };
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    setForm(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const clearAll = () => {
    if (!confirm('Clear all AI requirements?')) return;
    setForm(EMPTY);
    localStorage.removeItem(LS_KEY);
  };

  const loadTemplate = (id: string) => {
    const t = TEMPLATES[id];
    if (!t) return;
    setForm((f) => ({ ...f, ...t }));
  };

  return (
    <div className="ai-layout">
      <div>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">⚡ System Requirements Input</span>
            <span className="ai-badge">AI reads this first</span>
          </div>
          <div className="card-body">
            <p className="ai-intro">
              Enter operational logic, constraints, or notes below. The AI assistant reads this module before generating tours, proposals, or CRM outputs — allowing you to customise its behaviour without changing the code.
            </p>
            {(
              [
                ['rules', 'Core Business Rules & Constraints', 120, WRITING_TIPS[0].hint],
                ['suppliers', 'Preferred Supplier Logic', 80, WRITING_TIPS[1].hint],
                ['pricing', 'Pricing & Financial Rules', 80, WRITING_TIPS[2].hint],
                ['design', 'Tour Design Logic', 80, WRITING_TIPS[3].hint],
                ['voice', 'Brand Voice & Proposal Style', 80, WRITING_TIPS[4].hint],
                ['extra', 'Extra Notes / Special Instructions', 80, 'Any other operational constraints, seasonal rules, VIP client handling protocols, emergency procedures...'],
              ] as const
            ).map(([key, label, minH, placeholder]) => (
              <div className="fg" key={key}>
                <label className="lbl">{label}</label>
                <textarea
                  style={{ minHeight: minH }}
                  placeholder={placeholder}
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                />
              </div>
            ))}
            <div className="ai-actions">
              <button className="btn btn-s" type="button" onClick={clearAll}>
                Clear All
              </button>
              <button className="btn btn-p" type="button" onClick={save}>
                💾 Save Requirements
              </button>
            </div>
            {saved && <div className="ai-save-confirm">✓ Requirements saved. The AI will read these before generating any tour or proposal output.</div>}
          </div>
        </div>
      </div>

      <div className="ai-sidebar">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">How It Works</span>
          </div>
          <div className="card-body ai-steps">
            {[
              'You write rules here in plain language — no coding needed.',
              'AI reads this first before generating any proposal, itinerary, or quote email.',
              'Outputs adapt — routing, pricing, tone, and supplier choices all reflect your rules.',
              'Update anytime — save new rules and all future AI outputs update immediately.',
            ].map((text, i) => (
              <div key={i} className="ai-step">
                <div className="ai-step-num">{i + 1}</div>
                <div>{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">Quick Templates</span>
          </div>
          <div className="card-body ai-templates">
            <button className="btn btn-s btn-sm" type="button" onClick={() => loadTemplate('standard')}>
              📋 Standard Luxury Template
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={() => loadTemplate('uhnw')}>
              💎 UHNW Private Expedition
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={() => loadTemplate('family')}>
              👨‍👩‍👧 Family Adventure
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={() => loadTemplate('b2b')}>
              🤝 B2B Agent Rules
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">✍ Writing Tips</span>
          </div>
          <div className="card-body ai-tips">
            {WRITING_TIPS.map((t) => (
              <div key={t.label} className="ai-tip-row">
                <span className="ai-tip-label">{t.label}</span>
                <span className="ai-tip-hint">{t.hint}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-hd">
            <span className="card-title">Current Status</span>
          </div>
          <div className="card-body">
            <div className="ai-status-list">
              {(
                [
                  ['Business Rules', form.rules],
                  ['Supplier Logic', form.suppliers],
                  ['Pricing Rules', form.pricing],
                  ['Tour Design Logic', form.design],
                  ['Brand Voice', form.voice],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="ai-status-row">
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: val.trim() ? 'var(--g)' : 'var(--m)' }}>{statusLabel(val)}</span>
                </div>
              ))}
            </div>
            <div className="ai-last-saved">Last saved: {form.lastSaved || 'Never'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
