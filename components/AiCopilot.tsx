'use client';

import { useState } from 'react';
import { useAiCopilot } from '@/components/AiCopilotContext';
import { useLanguage } from '@/hooks/useLanguage';

export default function AiCopilot() {
  const { tp, language } = useLanguage();
  const { open, setOpen } = useAiCopilot();
  const [input, setInput] = useState('');
  const readyText = tp('chrome', 'aiSystemReady');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: 'system', text: readyText },
  ]);
  const [prevLanguage, setPrevLanguage] = useState(language);

  if (language !== prevLanguage) {
    setPrevLanguage(language);
    setMessages([{ role: 'system', text: readyText }]);
  }

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: 'user', text: input },
      { role: 'assistant', text: tp('chrome', 'aiDemoReply') },
    ]);
    setInput('');
  };

  return (
    <div id="ai-copilot-panel" className={open ? 'open' : ''}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--b)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="ai-dot" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{tp('chrome', 'aiTitle')}</div>
          <div style={{ fontSize: 11, color: 'var(--m)' }}>{tp('chrome', 'aiSubtitle')}</div>
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
          placeholder={tp('chrome', 'aiPlaceholder')}
          style={{ minHeight: 60, marginBottom: 8 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn btn-p btn-sm" onClick={send} type="button">
          {tp('chrome', 'aiSend')}
        </button>
      </div>
    </div>
  );
}

export function AiCopilotTrigger() {
  const { tp } = useLanguage();
  const { open, toggle } = useAiCopilot();

  return (
    <button
      type="button"
      className={`btn btn-s btn-sm ai-copilot-topbtn${open ? ' on' : ''}`}
      onClick={toggle}
      title={tp('chrome', 'aiTriggerTitle')}
      aria-pressed={open}
    >
      <span className="ai-dot" />
      <span className="ai-copilot-topbtn-label">{tp('chrome', 'aiTitle')}</span>
    </button>
  );
}
