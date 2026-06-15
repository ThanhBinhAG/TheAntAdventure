'use client';

import { useState } from 'react';

export default function AiCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    {
      role: 'system',
      text: 'AI Co-Pilot ready. Connect your Anthropic API key in ⚡ AI Requirements to enable live responses.',
    },
  ]);

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: 'user', text: input }, { role: 'assistant', text: 'Demo mode — configure API key in AI Requirements page.' }]);
    setInput('');
  };

  return (
    <>
      <div id="ai-copilot-panel" className={open ? 'open' : ''}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--b)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ai-dot" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>AI Co-Pilot</div>
            <div style={{ fontSize: 11, color: 'var(--m)' }}>Tour design assistant</div>
          </div>
          <button className="btn btn-s btn-sm" onClick={() => setOpen(false)} type="button">
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role}`}>
              <div className="ai-bubble">{m.text}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: '1px solid var(--b)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about itineraries, pricing, clients…"
            style={{ minHeight: 60, marginBottom: 8 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn btn-p btn-sm" onClick={send} type="button">
            Send
          </button>
        </div>
      </div>
      <button id="ai-copilot-btn" onClick={() => setOpen(true)} type="button">
        <span className="ai-dot" /> AI Co-Pilot
      </button>
    </>
  );
}
