'use client';

import { useLanguage } from '@/hooks/useLanguage';

const VALUE_KEYS = [
  ['🐜', 'cultureValueCraftTitle', 'cultureValueCraftBody'],
  ['🌱', 'cultureValueLocalTitle', 'cultureValueLocalBody'],
  ['🤝', 'cultureValueIntegrityTitle', 'cultureValueIntegrityBody'],
  ['✨', 'cultureValueLuxuryTitle', 'cultureValueLuxuryBody'],
  ['📈', 'cultureValueGrowthTitle', 'cultureValueGrowthBody'],
  ['💚', 'cultureValueResponsibleTitle', 'cultureValueResponsibleBody'],
] as const;

const WE_ARE_KEYS = [
  'cultureWeAreWarm',
  'cultureWeAreConfident',
  'cultureWeArePoetic',
  'cultureWeAreRooted',
  'cultureWeAreSecondPerson',
] as const;

const WE_NEVER_KEYS = [
  'cultureNeverCliches',
  'cultureNeverOversell',
  'cultureNeverExclaim',
  'cultureNeverGeneric',
  'cultureNeverHero',
] as const;

export default function Culture() {
  const { tp } = useLanguage();

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🎯 {tp('portal', 'cultureMission')}</span>
          </div>
          <div className="card-body">
            <div className="info-bar" style={{ fontSize: 13.5, fontStyle: 'italic', lineHeight: 1.7 }}>
              {tp('portal', 'cultureMissionText')}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🔭 {tp('portal', 'cultureVision')}</span>
          </div>
          <div className="card-body">
            <div className="info-bar culture-vision-bar">{tp('portal', 'cultureVisionText')}</div>
          </div>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd">
          <span className="card-title">🧭 {tp('portal', 'cultureCoreValues')}</span>
        </div>
        <div className="card-body">
          <div className="culture-values-grid">
            {VALUE_KEYS.map(([icon, titleKey, bodyKey]) => (
              <div key={titleKey} className="culture-value-card">
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div className="culture-value-title">{tp('portal', titleKey)}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65 }}>{tp('portal', bodyKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">🎨 {tp('portal', 'cultureBrandVoice')}</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="culture-voice-label culture-voice-yes">{tp('portal', 'cultureWeAre')}</div>
              <div className="culture-voice-list">
                {WE_ARE_KEYS.map((key) => (
                  <div key={key}>✓ {tp('portal', key)}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="culture-voice-label culture-voice-no">{tp('portal', 'cultureWeNever')}</div>
              <div className="culture-voice-list">
                {WE_NEVER_KEYS.map((key) => (
                  <div key={key}>✗ {tp('portal', key)}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
