'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

export default function About() {
  const { tp, language } = useLanguage();
  const defaultTagline = tp('portal', 'aboutTaglineDefault');
  const [tagline, setTagline] = useState(defaultTagline);
  const [prevLanguage, setPrevLanguage] = useState(language);

  if (language !== prevLanguage) {
    setPrevLanguage(language);
    setTagline(defaultTagline);
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="about-hero">
            <div className="about-hero-title">{tp('portal', 'aboutHeroTitle')}</div>
            <div className="about-hero-sub">{tp('portal', 'aboutHeroSub')}</div>
            <div className="about-hero-tagline">{tagline}</div>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 13, lineHeight: 1.85 }}>
              <p style={{ marginBottom: 14 }}>{tp('portal', 'aboutPara1')}</p>
              <p style={{ marginBottom: 14 }}>{tp('portal', 'aboutPara2')}</p>
              <p>{tp('portal', 'aboutPara3')}</p>
            </div>
            <div className="divider" style={{ height: 1, background: 'var(--b)', margin: '16px 0' }} />
            <Link href="/culture" className="btn btn-s btn-sm">
              🌿 {tp('portal', 'aboutViewCulture')}
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('portal', 'aboutCompanyFacts')}</span>
            </div>
            <div className="card-body about-facts">
              {(
                [
                  ['aboutFactFounded', '2024'],
                  ['aboutFactHq', 'Ho Chi Minh City'],
                  ['aboutFactEmail', 'taipham@theantadventures.com'],
                  ['aboutFactMarkets', 'USA, AUS, FR, UK, DE'],
                  ['aboutFactRevenueTarget', '$10M'],
                  ['aboutFactTeamTarget', '50 staff'],
                ] as const
              ).map(([key, v]) => (
                <div key={key} className="about-fact-row">
                  <span>{tp('portal', key)}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('portal', 'aboutBrandColor')}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 8, background: '#2E7D52' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>#2E7D52</div>
                <div style={{ fontSize: 11.5, color: 'var(--m)' }}>{tp('portal', 'aboutBrandGreenLabel')}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('portal', 'aboutQuickEdit')}</span>
            </div>
            <div className="card-body" style={{ padding: 14 }}>
              <div className="fg">
                <label className="lbl">{tp('portal', 'aboutTaglineLabel')}</label>
                <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} style={{ minHeight: 60 }} />
              </div>
              <button className="btn btn-p btn-sm" type="button" style={{ marginTop: 8 }}>
                {tp('portal', 'aboutSaveChanges')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-title">{tp('portal', 'aboutRoadmapTitle')}</span>
        </div>
        <div className="card-body">
          <div className="about-roadmap">
            <div className="about-roadmap-phase about-roadmap-foundation">
              <div className="about-roadmap-label">{tp('portal', 'aboutPhaseFoundation')}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{tp('portal', 'aboutPhaseFoundationBody')}</div>
            </div>
            <div className="about-roadmap-phase about-roadmap-scaling">
              <div className="about-roadmap-label">{tp('portal', 'aboutPhaseScaling')}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{tp('portal', 'aboutPhaseScalingBody')}</div>
            </div>
            <div className="about-roadmap-phase about-roadmap-mastery">
              <div className="about-roadmap-label">{tp('portal', 'aboutPhaseMastery')}</div>
              <div style={{ whiteSpace: 'pre-line' }}>{tp('portal', 'aboutPhaseMasteryBody')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
