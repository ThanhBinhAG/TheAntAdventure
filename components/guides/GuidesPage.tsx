'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import GuideCalendar from '@/components/guides/GuideCalendar';
import PaginationBar from '@/components/PaginationBar';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useGuidesPage } from '@/hooks/useGuidesPage';
import { useStore } from '@/hooks/useStore';
import { uploadGuideAvatarClient } from '@/lib/guides/guide-avatar-client';
import type { Guide } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

const REG_COLORS: Record<string, string> = { North: 'bdg-g', Central: 'bdg-a', South: 'bdg-b' };
const STATUS_C: Record<string, string> = {
  Available: 'bdg-g',
  'On Tour': 'bdg-b',
  Standby: 'bdg-a',
  Unavailable: 'bdg-r',
};

type GuideTab = 'roster' | 'bios' | 'calendar';

const emptyGuide = (): Partial<Guide> => ({
  id: '',
  fullname: '',
  ename: '',
  region: 'North',
  location: '',
  status: 'Available',
  phone: '',
  email: '',
  langs: 'EN',
  specialty: '',
  years: 0,
  rate: 0,
  license: 'National',
  rating: '★★★★',
  shirtSize: '',
  bankAccount: '',
  address: '',
  bio: '',
  photo: '',
  reviews: [],
});

export default function Guides() {
  const { canWrite } = usePagePermission('guides');
  const { guides, error: loadError } = useGuidesPage();
  const addGuide = useStore((s) => s.addGuide);
  const updateGuide = useStore((s) => s.updateGuide);

  const [tab, setTab] = useState<GuideTab>('roster');
  const [search, setSearch] = useState('');
  const [regionF, setRegionF] = useState('');
  const [langF, setLangF] = useState('');
  const [bioGuide, setBioGuide] = useState<Guide | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Guide>>(emptyGuide());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      guides.filter((g) => {
        if (regionF && g.region !== regionF) return false;
        if (langF && !g.langs.toLowerCase().includes(langF.toLowerCase())) return false;
        if (
          search &&
          !g.fullname.toLowerCase().includes(search.toLowerCase()) &&
          !g.ename.toLowerCase().includes(search.toLowerCase()) &&
          !g.specialty.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [guides, search, regionF, langF]
  );

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, regionF, langF, tab, pageSize]);
  const { paginatedItems } = pagination;

  const available = guides.filter((g) => g.status === 'Available').length;
  const onTour = guides.filter((g) => g.status === 'On Tour').length;

  const guideModalKey = showAdd ? `${editId ?? 'new'}` : 'closed';
  const baselineGuide = useMemo(() => {
    if (!showAdd) return emptyGuide();
    if (editId) {
      const guide = guides.find((g) => g.id === editId);
      return guide ? { ...guide } : emptyGuide();
    }
    return emptyGuide();
  }, [showAdd, editId, guides]);
  const { language, tp, tpl, tc } = useLanguage();
  const guideDirty = useFormDirty(
    showAdd,
    { form: baselineGuide, hasAvatar: false },
    { form, hasAvatar: Boolean(avatarFile) },
    (v) => JSON.stringify(v),
    guideModalKey,
  );
  const closeGuideModal = () => setShowAdd(false);
  const { requestClose: requestGuideClose } = useConfirmClose({
    open: showAdd,
    dirty: guideDirty,
    onClose: closeGuideModal,
    disabled: saving,
    language,
  });

  const openAdd = (g?: Guide) => {
    if (g) {
      setEditId(g.id);
      setForm({ ...g });
    } else {
      setEditId(null);
      setForm(emptyGuide());
    }
    setAvatarFile(null);
    setShowAdd(true);
  };

  const saveGuide = async () => {
    if (!form.fullname || !form.id) {
      toast.warning(tp('guides', 'requiredToast'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...(form as Guide), photo: form.photo || '' };
      const response = await fetch('/api/guides', {
        method: editId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide: payload }),
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; data?: Guide; error?: string } | null;
      if (!response.ok || !body?.ok || !body.data) {
        throw new Error(body?.error ?? tp('guides', 'saveError'));
      }
      const saved = avatarFile
        ? { ...body.data, photo: await uploadGuideAvatarClient(body.data.id, avatarFile) }
        : body.data;
      if (editId) updateGuide(editId, saved);
      else addGuide(saved);
      setShowAdd(false);
      setAvatarFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp('guides', 'avatarUploadFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loadError && <div className="crm-page-hydrate-error" role="alert">{loadError}</div>}
      <div className="pt-banner">
        <span style={{ fontSize: 12.5, color: 'var(--gd)' }}>
          📋 <b>{tp('guides', 'postTourBanner')}</b> {tp('guides', 'postTourBannerDesc')}
        </span>
        <Link href="/posttour" className="btn btn-p btn-sm">
          {tp('guides', 'guideReportForm')}
        </Link>
        <Link href="/posttour" className="btn btn-s btn-sm">
          {tp('guides', 'opsDebriefForm')}
        </Link>
        <Link href="/attractions" className="btn btn-s btn-sm">
          {tp('guides', 'attractionSchedule')}
        </Link>
      </div>

      <div className="tabs">
        <div className={`tab${tab === 'roster' ? ' on' : ''}`} onClick={() => setTab('roster')} role="button" tabIndex={0}>
          {tp('guides', 'tabRoster')}
        </div>
        <div className={`tab${tab === 'bios' ? ' on' : ''}`} onClick={() => setTab('bios')} role="button" tabIndex={0}>
          {tp('guides', 'tabBios')}
        </div>
        <div className={`tab${tab === 'calendar' ? ' on' : ''}`} onClick={() => setTab('calendar')} role="button" tabIndex={0}>
          {tp('guides', 'tabCalendar')}
        </div>
      </div>

      {tab === 'roster' && (
        <>
          <div className="search-row">
            <input placeholder={tp('guides', 'searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
            <select value={regionF} onChange={(e) => setRegionF(e.target.value)}>
              <option value="">{tp('guides', 'allRegions')}</option>
              <option>North</option>
              <option>Central</option>
              <option>South</option>
            </select>
            <select value={langF} onChange={(e) => setLangF(e.target.value)}>
              <option value="">{tp('guides', 'allLanguages')}</option>
              <option>English</option>
              <option>French</option>
              <option>German</option>
            </select>
            <div style={{ flex: 1 }} />
            <button className="btn btn-s btn-sm" type="button" onClick={() => setTab('bios')}>
              {tp('guides', 'viewBioCards')}
            </button>
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? tp('guides', 'readOnlyAdd') : undefined}
            >
              {tp('guides', 'addGuide')}
            </button>
          </div>

          <div className="guides-kpi-bar">
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">{tp('guides', 'kpiTotal')}</div>
              <div className="guides-kpi-v">{guides.length}</div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">{tp('guides', 'kpiAvailable')}</div>
              <div className="guides-kpi-v" style={{ color: 'var(--g)' }}>
                {available}
              </div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">{tp('guides', 'kpiOnTour')}</div>
              <div className="guides-kpi-v" style={{ color: 'var(--blue)' }}>
                {onTour}
              </div>
            </div>
            <div className="guides-kpi-item">
              <div className="guides-kpi-l">{tp('guides', 'kpiShown')}</div>
              <div className="guides-kpi-v">{filtered.length}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{tp('guides', 'colGuideId')}</th>
                    <th>{tp('guides', 'colFullNameCity')}</th>
                    <th>{tp('guides', 'colDisplayName')}</th>
                    <th>{tp('guides', 'colRegion')}</th>
                    <th>{tp('guides', 'colLanguages')}</th>
                    <th>{tp('guides', 'colSpecialty')}</th>
                    <th>{tp('guides', 'colExperience')}</th>
                    <th>{tp('guides', 'colDayRate')}</th>
                    <th>{tp('guides', 'colRating')}</th>
                    <th>{tp('guides', 'colStatus')}</th>
                    <th>{tp('guides', 'colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{g.id}</code>
                      </td>
                      <td>
                        <b>{g.fullname}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{g.location}</div>
                      </td>
                      <td>{g.ename}</td>
                      <td>
                        <span className={`bdg ${REG_COLORS[g.region] || 'bdg-w'}`}>{g.region}</span>
                      </td>
                      <td>{g.langs}</td>
                      <td style={{ fontSize: 12 }}>{g.specialty}</td>
                      <td>
                        <span style={{ color: 'var(--g)', fontWeight: 600 }}>✓</span> {g.license}
                        {g.years ? <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{tpl('guides', 'yearsSuffix', { count: g.years })}</div> : null}
                      </td>
                      <td style={{ fontWeight: 600, color: g.rate > 0 ? 'var(--g)' : 'var(--m)' }}>{g.rate > 0 ? `$${g.rate}/day` : tp('guides', 'rateTbd')}</td>
                      <td style={{ color: 'var(--gold)' }}>{g.rating}</td>
                      <td>
                        <span className={`bdg ${STATUS_C[g.status] || 'bdg-w'}`}>{g.status}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-s btn-sm" type="button" onClick={() => setBioGuide(g)}>
                          {tp('guides', 'profile')}
                        </button>
                        <button
                          className="btn btn-s btn-sm"
                          type="button"
                          style={{ marginLeft: 4 }}
                          onClick={() => openAdd(g)}
                          disabled={!canWrite}
                          title={!canWrite ? tp('guides', 'readOnlyEdit') : undefined}
                        >
                          {tp('guides', 'edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}

      {tab === 'bios' && (
        <>
          <div className="guide-bio-grid">
            {paginatedItems.map((g) => (
              <div key={g.id} className="guide-bio-card" onClick={() => setBioGuide(g)} role="button" tabIndex={0}>
                {g.photo ? (
                  <div className="guide-bio-avatar guide-bio-avatar-img" style={{ position: 'relative', overflow: 'hidden' }}>
                    <Image src={g.photo} alt={g.fullname} fill style={{ objectFit: 'cover' }} sizes="80px" />
                  </div>
                ) : (
                  <div className="guide-bio-avatar" style={{ background: g.region === 'North' ? 'var(--g)' : g.region === 'Central' ? 'var(--amb)' : 'var(--blue)' }}>
                    {g.ename.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="guide-bio-name">{g.fullname}</div>
                <div className="guide-bio-sub">
                  {g.ename} · {g.region}
                </div>
                <div className="guide-bio-specialty">{g.specialty}</div>
                <div className="guide-bio-meta">
                  <span className={`bdg ${STATUS_C[g.status] || 'bdg-w'}`}>{g.status}</span>
                  <span className="guide-bio-rating">{g.rating}</span>
                  {g.rate > 0 && <span className="guide-bio-rate">${g.rate}/day</span>}
                </div>
                {g.bio && g.bio.length > 0 && (
                  <div className="guide-bio-snippet">{g.bio.length > 120 ? `${g.bio.slice(0, 120)}…` : g.bio}</div>
                )}
              </div>
            ))}
          </div>
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
        </>
      )}

      {tab === 'calendar' && <GuideCalendar canWrite={canWrite} />}

      {bioGuide && (
        <div className="overlay open" onClick={() => setBioGuide(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 680, padding: 0, overflow: 'hidden' }}>
            <div className="modal-hd modal-hd-green">
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{bioGuide.fullname}</div>
                <div style={{ fontSize: 12, opacity: 0.85, color: '#fff' }}>
                  {bioGuide.ename} · {bioGuide.region} · {bioGuide.rating}
                </div>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setBioGuide(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 20, fontSize: 13, lineHeight: 1.7 }}>
              <p>{bioGuide.bio}</p>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--m)' }}>
                📞 {bioGuide.phone} · ✉ {bioGuide.email} · {bioGuide.langs}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="overlay open" onClick={() => void requestGuideClose()}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 700, maxHeight: '92vh', overflow: 'auto' }}>
            <div className="modal-hd modal-hd-green">
              <span style={{ color: '#fff', fontWeight: 700 }}>{editId ? tp('guides', 'editGuide') : tp('guides', 'addNewGuide')}</span>
              <button className="modal-close-btn" type="button" onClick={() => void requestGuideClose()}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblGuideId')}</label>
                  <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder={tp('guides', 'guideIdPlaceholder')} disabled={!!editId} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblFullName')}</label>
                  <input value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblEnglishName')}</label>
                  <input value={form.ename} onChange={(e) => setForm({ ...form, ename: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblRegion')}</label>
                  <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                    <option>North</option>
                    <option>Central</option>
                    <option>South</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblCityBase')}</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblStatus')}</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Available</option>
                    <option>On Tour</option>
                    <option>Standby</option>
                    <option>Unavailable</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblLanguages')}</label>
                  <input value={form.langs} onChange={(e) => setForm({ ...form, langs: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblSpecialty')}</label>
                  <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblYearsExp')}</label>
                  <input type="number" value={form.years || ''} onChange={(e) => setForm({ ...form, years: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('guides', 'lblDayRate')}</label>
                  <input type="number" value={form.rate || ''} onChange={(e) => setForm({ ...form, rate: +e.target.value })} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">{tp('guides', 'lblAvatar')}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  disabled={saving}
                />
                {form.photo && !avatarFile && (
                  <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>{tp('guides', 'avatarKeepHint')}</div>
                )}
              </div>
              <div className="fg">
                <label className="lbl">{tp('guides', 'lblBiography')}</label>
                <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--b)', paddingTop: 12 }}>
                <button className="btn btn-s" type="button" onClick={() => void requestGuideClose()}>
                  {tc('cancel')}
                </button>
                <button className="btn btn-p" type="button" onClick={() => void saveGuide()} disabled={saving}>
                  {saving ? tp('guides', 'saving') : tp('guides', 'saveGuide')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
