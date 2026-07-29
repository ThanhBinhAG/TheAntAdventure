'use client';

import { useMemo, useState } from 'react';
import ExtSupplierCard from '@/components/suppliers/ExtSupplierCard';
import ExtendedSupplierFormModal from '@/components/suppliers/ExtendedSupplierFormModal';
import { useStore } from '@/hooks/useStore';
import { filterExtendedSuppliers, preselectCategoryForTab, type SupplierFilters } from '@/lib/suppliers/supplier-utils';
import type { ExtendedSupplier } from '@/lib/types';

export type ExtendedSection = 'logistics' | 'water' | 'adventure' | 'experience' | 'personnel';

type Props = {
  section: ExtendedSection;
  filters: SupplierFilters;
};

function ExtGrid({
  items,
  onEdit,
  onDelete,
}: {
  items: ExtendedSupplier[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <div className="sup-empty-grid">
        <p>No suppliers found. Add one using the button above.</p>
      </div>
    );
  }
  return (
    <div className="sup-ext-grid">
      {items.map((s) => (
        <ExtSupplierCard key={s.id} supplier={s} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function ExtendedSupplierTab({ section, filters }: Props) {
  const specialSuppliers = useStore((s) => s.specialSuppliers);
  const addSpecialSupplier = useStore((s) => s.addSpecialSupplier);
  const updateSpecialSupplier = useStore((s) => s.updateSpecialSupplier);
  const removeSpecialSupplier = useStore((s) => s.removeSpecialSupplier);

  const [logSub, setLogSub] = useState<'visa' | 'fasttrack' | 'aviation'>('visa');
  const [advSub, setAdvSub] = useState<'cycling' | 'trekking' | 'wildlife'>('cycling');
  const [expSub, setExpSub] = useState<'artisan' | 'wellness' | 'events'>('artisan');
  const [perSub, setPerSub] = useState<'specguide' | 'media' | 'safety'>('specguide');
  const [perLang, setPerLang] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultCat, setDefaultCat] = useState('visa');

  const editSupplier = editId ? specialSuppliers.find((s) => s.id === editId) : null;

  const getExt = (cats: string[]) => {
    let items = filterExtendedSuppliers(specialSuppliers, cats, filters);
    if (perLang && cats.includes('specguide')) {
      items = items.filter((s) => (s.subcat || '').includes(perLang));
    }
    return items;
  };

  const openAdd = () => {
    let cat = preselectCategoryForTab(section);
    if (section === 'logistics') cat = logSub;
    else if (section === 'adventure') cat = advSub;
    else if (section === 'experience') cat = expSub;
    else if (section === 'personnel') cat = perSub;
    setDefaultCat(cat);
    setEditId(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleSave = (supplier: ExtendedSupplier) => {
    if (formMode === 'edit' && editId) {
      updateSpecialSupplier(editId, supplier);
    } else {
      addSpecialSupplier(supplier);
    }
  };

  const deleteExt = (id: string) => {
    if (confirm('Remove this supplier?')) removeSpecialSupplier(id);
  };

  const addLabel = useMemo(() => {
    const labels: Record<ExtendedSection, string> = {
      logistics: '＋ Add Logistics Supplier',
      water: '＋ Add Water Supplier',
      adventure: '＋ Add Adventure Supplier',
      experience: '＋ Add Experience Provider',
      personnel: '＋ Add Personnel Supplier',
    };
    return labels[section];
  }, [section]);

  return (
    <>
      {section === 'logistics' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['visa', '🪪 Visa Services'],
                  ['fasttrack', '⚡ Airport Fast Track'],
                  ['aviation', '✈️ Aviation'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${logSub === id ? ' on' : ''}`} onClick={() => setLogSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              {addLabel}
            </button>
          </div>
          {logSub === 'visa' && (
            <>
              <div className="info-bar">Visa partners handle E-visa applications, urgent processing (24–48hr), and business multi-entry visas for all nationalities.</div>
              <ExtGrid items={getExt(['visa'])} onEdit={openEdit} onDelete={deleteExt} />
            </>
          )}
          {logSub === 'fasttrack' && (
            <>
              <div className="info-bar">
                Airport fast track covers VIP arrival/departure lanes, immigration assistance, and lounge access — sorted by region: <b>North (HAN/HPH)</b> · <b>Central (HUI/DAD)</b> · <b>South (SGN/CXR/PQC)</b>.
              </div>
              <ExtGrid items={getExt(['fasttrack'])} onEdit={openEdit} onDelete={deleteExt} />
            </>
          )}
          {logSub === 'aviation' && (
            <>
              <div className="info-bar">Covers domestic scheduled airlines and private charter operators for helicopter, seaplane, and small fixed-wing aircraft.</div>
              <ExtGrid items={getExt(['aviation'])} onEdit={openEdit} onDelete={deleteExt} />
            </>
          )}
        </>
      )}

      {section === 'water' && (
        <>
          <div className="sup-sub-bar">
            <div className="info-bar" style={{ margin: 0, flex: 1 }}>
              Private boat charter suppliers: river sampans, coastal speedboats, and national park boats.
            </div>
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              {addLabel}
            </button>
          </div>
          <ExtGrid items={getExt(['river', 'coastal', 'park'])} onEdit={openEdit} onDelete={deleteExt} />
        </>
      )}

      {section === 'adventure' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['cycling', '🚴 Cycling'],
                  ['trekking', '🥾 Trekking & Camping'],
                  ['wildlife', '🦅 Wildlife & Nature'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${advSub === id ? ' on' : ''}`} onClick={() => setAdvSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {advSub === 'cycling' && 'Cycling suppliers: high-end road and mountain bikes, support vehicles, mobile maintenance crew.'}
            {advSub === 'trekking' && 'Trekking & camping gear rental: tents, sleeping bags, GPS trackers, portable radios, first-aid kits.'}
            {advSub === 'wildlife' && 'Wildlife & nature experts: ornithologists, marine biologists, karst geologists, wildlife trackers.'}
          </div>
          <ExtGrid items={getExt([advSub])} onEdit={openEdit} onDelete={deleteExt} />
        </>
      )}

      {section === 'experience' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['artisan', '🎨 Artisans & Cultural'],
                  ['wellness', '💆 Luxury Wellness'],
                  ['events', '🎪 Events & Decor'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${expSub === id ? ' on' : ''}`} onClick={() => setExpSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {expSub === 'artisan' && 'Master artisans, cultural experts, musicians, and performers for private in-depth experiences.'}
            {expSub === 'wellness' && 'Luxury wellness partners: traditional medicine doctors, spa directors, meditation guides.'}
            {expSub === 'events' && 'Exclusive event & decor specialists: private beach dinners, floral designers, lantern lighting.'}
          </div>
          <ExtGrid items={getExt([expSub])} onEdit={openEdit} onDelete={deleteExt} />
        </>
      )}

      {section === 'personnel' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['specguide', '🗣 Specialist Guides'],
                  ['media', '📷 Media Production'],
                  ['safety', '🛡 Security & Health'],
                ] as const
              ).map(([id, label]) => (
                <div key={id} className={`tab${perSub === id ? ' on' : ''}`} onClick={() => setPerSub(id)} role="button" tabIndex={0}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" type="button" onClick={() => openAdd()}>
              {addLabel}
            </button>
          </div>
          {perSub === 'specguide' && (
            <div className="search-row" style={{ marginBottom: 10 }}>
              <select value={perLang} onChange={(e) => setPerLang(e.target.value)}>
                <option value="">All Languages</option>
                <option value="EN">🇬🇧 English</option>
                <option value="FR">🇫🇷 French</option>
                <option value="DE">🇩🇪 German</option>
              </select>
            </div>
          )}
          <div className="info-bar">Specialist guides, media production, and security & health partners — all VNAT-licensed where applicable.</div>
          <ExtGrid items={getExt([perSub])} onEdit={openEdit} onDelete={deleteExt} />
        </>
      )}

      <ExtendedSupplierFormModal
        open={formOpen}
        mode={formMode}
        supplier={editSupplier}
        defaultCat={defaultCat}
        existing={specialSuppliers}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
