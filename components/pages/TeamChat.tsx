'use client';

import { useMemo, useRef, useState } from 'react';
import { useStore } from '@/hooks/useStore';

const CHANNEL_META: Record<string, { title: string; desc: string }> = {
  general: { title: '# general', desc: 'General team conversation' },
  sales: { title: '# sales', desc: 'Sales, leads, and client updates' },
  operations: { title: '# operations', desc: 'Tours, guides, and logistics' },
  finance: { title: '# finance', desc: 'Invoices, payments, and reports' },
  guides: { title: '# guides', desc: 'Guide briefings and coordination' },
  devnotes: { title: '# dev-requests', desc: 'Technical requests and dev updates' },
  tai: { title: '@ Tai Pham', desc: 'Direct message' },
  linh: { title: '@ Linh N.', desc: 'Direct message' },
  minh: { title: '@ Minh T.', desc: 'Direct message' },
  huong: { title: '@ Huong L.', desc: 'Direct message' },
};

const AVATAR_COLORS = ['#2E7D52', '#1565C0', '#D97706', '#6B21A8', '#C0392B', '#0c5464', '#856404'];

type Message = { id: string; author: string; text: string; time: string; reactions?: string[] };

function strColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TeamChat() {
  const seedMessages = useStore((s) => s.messages) as Record<string, Message[]>;
  const [channel, setChannel] = useState('general');
  const [draft, setDraft] = useState('');
  const [localMsgs, setLocalMsgs] = useState<Record<string, Message[]>>({});
  const [myName, setMyName] = useState('Tai Pham');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const allMessages = useMemo(() => {
    const merged: Record<string, Message[]> = { ...seedMessages };
    Object.entries(localMsgs).forEach(([ch, msgs]) => {
      merged[ch] = [...(merged[ch] || []), ...msgs];
    });
    return merged;
  }, [seedMessages, localMsgs]);

  const channelMessages = allMessages[channel] || [];
  const meta = CHANNEL_META[channel] || { title: `# ${channel}`, desc: '' };

  const sendMessage = () => {
    if (!draft.trim()) return;
    const msg: Message = {
      id: `local-${Date.now()}`,
      author: myName.trim() || 'You',
      text: draft.trim(),
      time: new Date().toISOString(),
      reactions: [],
    };
    setLocalMsgs((prev) => ({
      ...prev,
      [channel]: [...(prev[channel] || []), msg],
    }));
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const formatTime = (t: string) => {
    try {
      const d = new Date(t);
      return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return t.slice(0, 16).replace('T', ' ');
    }
  };

  const autoresize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="chat-shell">
      <div className="chat-sidebar-dark">
        <div className="chat-sidebar-brand">
          <div className="chat-sidebar-brand-title">Team Chat</div>
          <div className="chat-sidebar-brand-sub">The Ant Adventures</div>
        </div>
        <div className="chat-channels-scroll">
          <div className="chat-sidebar-section">Channels</div>
          {['general', 'sales', 'operations', 'finance', 'guides', 'devnotes'].map((ch) => (
            <div key={ch} className={`chat-channel${channel === ch ? ' on' : ''}`} onClick={() => setChannel(ch)} role="button" tabIndex={0}>
              {CHANNEL_META[ch]?.title || `# ${ch}`}
            </div>
          ))}
          <div className="chat-sidebar-section" style={{ marginTop: 8 }}>
            Direct Messages
          </div>
          {['tai', 'linh', 'minh', 'huong'].map((ch) => (
            <div key={ch} className={`chat-channel${channel === ch ? ' on' : ''}`} onClick={() => setChannel(ch)} role="button" tabIndex={0}>
              {CHANNEL_META[ch]?.title || `@ ${ch}`}
            </div>
          ))}
        </div>
        <div className="chat-profile-footer">
          <div className="chat-profile-avatar" style={{ background: strColor(myName) }}>
            {initials(myName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="chat-profile-name"
              placeholder="Your name…"
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
            />
            <div className="chat-profile-status">● Online</div>
          </div>
        </div>
      </div>

      <div className="chat-main-panel">
        <div className="chat-channel-hd">
          <div>
            <div className="chat-channel-title">{meta.title}</div>
            <div className="chat-channel-desc">{meta.desc}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11.5, color: 'var(--m)' }}>{channelMessages.length} messages</div>
        </div>

        <div className="chat-messages">
          {channelMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--m)', padding: 40, fontSize: 13 }}>
              No messages yet. Start the conversation below.
            </div>
          ) : (
            channelMessages.map((m) => (
              <div className="chat-msg" key={m.id}>
                <div className="chat-avatar" style={{ background: strColor(m.author), color: '#fff' }}>
                  {initials(m.author)}
                </div>
                <div className="msg-bubble">
                  <div className="msg-meta">
                    <span className="msg-name">{m.author}</span>
                    <span className="msg-time">{formatTime(m.time)}</span>
                  </div>
                  <div className="msg-text">{m.text}</div>
                  {m.reactions && m.reactions.length > 0 && (
                    <div className="msg-reactions">
                      {m.reactions.map((r, i) => (
                        <span key={i} className="msg-reaction">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="chat-compose">
          <div className="chat-compose-row">
            <div className="chat-textarea-wrap">
              <textarea
                ref={textareaRef}
                placeholder={`Message ${meta.title}…`}
                rows={1}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  autoresize(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            <button className="chat-send-btn" type="button" onClick={sendMessage} disabled={!draft.trim()} aria-label="Send">
              ↑
            </button>
          </div>
          <div className="chat-compose-hint">
            Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
          </div>
        </div>
      </div>
    </div>
  );
}
