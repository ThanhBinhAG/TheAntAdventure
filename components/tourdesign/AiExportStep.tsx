'use client';

import { useEffect, useState } from 'react';
import { fmt } from '@/lib/constants';
import { stripMarkdown } from '@/lib/tour-itinerary';
import { paxToTierN, sumSellForProducts } from '@/lib/tour-pricing';
import type { TourBrief } from '@/lib/tour-design-types';
import type { Product } from '@/lib/types';

const API_KEY_STORAGE = 'ant_api_key';

interface Props {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  selectedProducts: Product[];
  markupPct: number;
  onSavePipeline: () => void;
  onReset: () => void;
  onBack: () => void;
}

export default function AiExportStep({
  brief,
  clientType,
  selectedProducts,
  markupPct,
  onSavePipeline,
  onReset,
  onBack,
}: Props) {
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState('No API key saved yet.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [showCopy, setShowCopy] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem(API_KEY_STORAGE) || '';
    setApiKey(k);
    setKeyStatus(k ? '✓ API key saved on this device.' : 'No API key saved yet.');
  }, []);

  const codes = selectedProducts.map((p) => p.code);
  const tierN = paxToTierN(brief.pax);
  const sellPerPax = sumSellForProducts(codes, tierN, markupPct);
  const groupTotal = sellPerPax * brief.pax;

  function saveKey() {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
    setKeyStatus(apiKey.trim() ? '✓ API key saved on this device.' : 'No API key saved yet.');
  }

  function clearKey() {
    localStorage.removeItem(API_KEY_STORAGE);
    setApiKey('');
    setKeyStatus('No API key saved yet.');
  }

  async function aiExport(type: 'proposal' | 'email') {
    if (!selectedProducts.length) {
      alert('Please select at least one experience first (Step 2).');
      return;
    }

    const expList = selectedProducts.map((p) => `- ${p.name} (${p.dur}): ${stripMarkdown(p.desc).slice(0, 120)}…`).join('\n');
    const special = brief.specialRequests || brief.notes || 'None';

    let prompt = '';
    if (type === 'proposal') {
      prompt = `You are the luxury travel writer for The Ant Adventures. Write a professional client-ready tour proposal.

CLIENT: ${brief.clientName || 'the client'} · ${brief.pax} pax · ${brief.style} · ${brief.hotelTier}
TRAVEL MONTH: ${brief.travelMonth} 2026 · LANGUAGE: ${brief.language}
SPECIAL: ${special}
SELL: $${fmt(sellPerPax)}/pax · GROUP: $${fmt(groupTotal)}

EXPERIENCES:
${expList}

Write: TOUR TITLE, TAGLINE, OVERVIEW, KEY HIGHLIGHTS, INCLUSIONS, PRICING table. Second person, sensory, unhurried tone.`;
    } else {
      prompt = `Write a warm proposal email for The Ant Adventures.

CLIENT: ${brief.clientName} · ${clientType === 'b2b' ? 'B2B Agent' : 'B2C'} · ${brief.pax} pax
MONTH: ${brief.travelMonth} 2026 · TIER: ${brief.hotelTier}
PRICING: $${fmt(sellPerPax)}/pax · Group $${fmt(groupTotal)}

EXPERIENCES:
${expList}

Include subject line, body, sign-off from Tai.`;
    }

    setLoading(true);
    setError('');
    setResult('');
    setShowCopy(false);

    const key = localStorage.getItem(API_KEY_STORAGE) || '';
    if (!key.startsWith('sk-')) {
      setLoading(false);
      setError('⚡ API key required. Enter your Anthropic API key above and click Save Key.');
      return;
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'API request failed.');
        return;
      }
      const text = data.content?.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n') || 'No response.';
      setResult(text);
      setShowCopy(true);
    } catch {
      setError('Network error — check your connection and API key.');
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    if (result) navigator.clipboard.writeText(result);
  }

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">Step 4 — AI-Powered Export ✦</span>
      </div>
      <div className="card-body">
        <div className="td-api-key-banner">
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pur)', marginBottom: 3 }}>⚡ Anthropic API Key Required for AI Export</div>
            <div style={{ fontSize: 11.5, color: '#4a1460' }}>Enter your key once — saved locally. Get yours at console.anthropic.com</div>
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ padding: '7px 11px', border: '1.5px solid var(--pur)', borderRadius: 7, fontFamily: 'monospace', fontSize: 12, width: 280 }}
            />
            <button className="btn btn-pu btn-sm" type="button" onClick={saveKey}>
              Save Key
            </button>
            <button type="button" onClick={clearKey} style={{ background: 'none', border: 'none', color: 'var(--m)', fontSize: 11, cursor: 'pointer' }}>
              Clear
            </button>
          </div>
          <div style={{ fontSize: 11.5, marginTop: 8, color: 'var(--m)', width: '100%' }}>{keyStatus}</div>
        </div>

        <div className="td-export-grid">
          <div className="td-export-card td-export-proposal" onClick={() => aiExport('proposal')} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g)' }}>Itinerary Proposal</div>
            <div style={{ fontSize: 11.5, color: 'var(--gd)', marginTop: 4 }}>AI writes full luxury narrative for this client</div>
          </div>
          <div className="td-export-card td-export-email" onClick={() => aiExport('email')} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✉️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92711d' }}>Quote Email</div>
            <div style={{ fontSize: 11.5, color: '#92711d', marginTop: 4 }}>AI drafts personalized B2C/B2B proposal email</div>
          </div>
          <div className="td-export-card td-export-save" onClick={onSavePipeline} role="button" tabIndex={0}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m)' }}>Save to Pipeline</div>
            <div style={{ fontSize: 11.5, color: 'var(--m)', marginTop: 4 }}>Add to Sales CRM as Designing-stage lead</div>
          </div>
        </div>

        {loading && (
          <div className="td-ai-loading">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}

        {error && <div className="td-ai-error">{error}</div>}

        {result && (
          <div className="td-ai-result">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>{result}</pre>
          </div>
        )}

        <div className="td-nav" style={{ marginTop: 16 }}>
          <button className="btn btn-s" type="button" onClick={onBack}>
            ← Back
          </button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {showCopy && (
              <button className="btn btn-s" type="button" onClick={copyResult}>
                📋 Copy Result
              </button>
            )}
            <button className="btn btn-s" type="button" onClick={onReset}>
              + New Design
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
