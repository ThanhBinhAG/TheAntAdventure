import type { ExtendedSupplier } from '@/lib/types';

export const SUP_MASTER_CATS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  visa: { label: 'Visa Services', emoji: '🪪', color: '#C0392B', bg: '#FDECEA' },
  fasttrack: { label: 'Airport Fast Track', emoji: '⚡', color: '#856404', bg: '#FFF3CD' },
  aviation: { label: 'Aviation', emoji: '✈️', color: '#6B21A8', bg: '#F3E8FF' },
  river: { label: 'River Sampans', emoji: '🛶', color: '#0c5464', bg: '#E0F7FA' },
  coastal: { label: 'Coastal Speedboats', emoji: '🚤', color: '#0277BD', bg: '#E1F5FE' },
  park: { label: 'National Park Boats', emoji: '🌿', color: '#1a5c38', bg: '#E8F5EE' },
  cycling: { label: 'Cycling', emoji: '🚴', color: '#1565C0', bg: '#E3F2FD' },
  trekking: { label: 'Trekking & Camping', emoji: '🥾', color: '#4a1460', bg: '#F3E5F5' },
  wildlife: { label: 'Wildlife & Nature', emoji: '🦅', color: '#1a5c38', bg: '#E8F5EE' },
  artisan: { label: 'Artisans & Cultural', emoji: '🎨', color: '#856404', bg: '#FFF3CD' },
  wellness: { label: 'Luxury Wellness', emoji: '💆', color: '#4a1460', bg: '#F3E5F5' },
  events: { label: 'Events & Decor', emoji: '🎪', color: '#C0392B', bg: '#FDECEA' },
  specguide: { label: 'Specialist Guides', emoji: '🗣', color: '#1565C0', bg: '#E3F2FD' },
  media: { label: 'Media Production', emoji: '📷', color: '#0c5464', bg: '#E1F0FF' },
  safety: { label: 'Security & Health', emoji: '🛡', color: '#C0392B', bg: '#FDECEA' },
};

export function regionLabel(region?: string) {
  if (region === 'national') return '🇻🇳 Nationwide';
  if (region === 'north') return '🔵 North';
  if (region === 'central') return '🟡 Central';
  if (region === 'south') return '🟠 South';
  return region || '—';
}

type Props = {
  supplier: ExtendedSupplier;
  onDelete?: (id: string) => void;
};

export default function ExtSupplierCard({ supplier: s, onDelete }: Props) {
  const cat = SUP_MASTER_CATS[s.cat] || { emoji: '📌', color: '#555', bg: '#F5F5F5', label: s.cat };
  return (
    <div className="sp-card">
      <div className="sp-card-header">
        <div className="sp-avatar" style={{ background: cat.bg, fontSize: 20 }}>
          {cat.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</span>
            <span className="sp-subcat-tag" style={{ background: cat.bg, color: cat.color }}>
              {cat.emoji} {s.subcat || cat.label}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--m)', marginBottom: 3 }}>
            📍 {s.location} · {regionLabel(s.region)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{s.rate}</div>
        </div>
      </div>
      <div className="sp-card-body">
        <div style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--t)', marginBottom: 8 }}>{s.desc}</div>
        {s.notes && <div className="sp-notes-box">📝 {s.notes}</div>}
        <div className="sp-tags-row">
          {(s.tags || []).map((t) => (
            <span key={t} className="sp-tag-pill">
              {t}
            </span>
          ))}
        </div>
        <div className="sp-card-footer">
          <span style={{ color: 'var(--gold)', fontSize: 12 }}>{s.rating}</span>
          <span className={`bdg ${s.status === 'Active' ? 'bdg-g' : s.status === 'Standby' ? 'bdg-a' : 'bdg-r'}`}>{s.status}</span>
          <span style={{ fontSize: 11, color: 'var(--m)' }}>{s.contract === 'yes' ? '✅ Contract' : '🤝 Verbal'}</span>
          <div style={{ flex: 1 }} />
          {s.phone && (
            <a href={`tel:${s.phone}`} className="sp-contact-btn sp-contact-phone">
              📞
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} className="sp-contact-btn sp-contact-email">
              ✉
            </a>
          )}
          {onDelete && (
            <button className="sp-delete-btn" type="button" onClick={() => onDelete(s.id)}>
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
