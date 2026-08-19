'use client';

import { useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import ExtSupplierCard from '@/components/suppliers/ExtSupplierCard';
import ExtendedSupplierFormModal from '@/components/suppliers/ExtendedSupplierFormModal';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useStore } from '@/hooks/useStore';
import { filterExtendedSuppliers, preselectCategoryForTab, type SupplierFilters } from '@/lib/suppliers/supplier-utils';
import type { ExtendedSupplier } from '@/lib/types';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';

export type ExtendedSection = 'logistics' | 'water' | 'adventure' | 'experience' | 'personnel';

type Props = {
  section: ExtendedSection;
  filters: SupplierFilters;
  canWrite?: boolean;
};

function ExtGrid({
  items,
  onEdit,
  onDelete,
  onAdd,
}: {
  items: ExtendedSupplier[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
}) {
  const { pageSize, setPageSize } = usePageSize();
  const itemKey = useMemo(() => items.map((i) => i.id).join('|'), [items]);
  const pagination = usePagination(items, pageSize, [itemKey, pageSize]);
  const { paginatedItems } = pagination;

  if (!items.length) {
    return (
      <EmptyState
        className="crm-empty-state--flush"
        size="compact"
        variant="suppliers"
        title="No suppliers found"
        description="Add a supplier for this category to start building your partner list."
        action={
          onAdd && (
            <button type="button" className="btn btn-p btn-sm" onClick={onAdd}>
              + Add Supplier
            </button>
          )
        }
      />
    );
  }
  return (
    <>
      <div className="sup-ext-grid">
        {paginatedItems.map((s) => (
          <ExtSupplierCard key={s.id} supplier={s} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
      <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
    </>
  );
}

export default function ExtendedSupplierTab({ section, filters, canWrite }: Props) {
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

  const deleteExt = async (id: string) => {
    const ok = await confirmDialog('Remove this supplier?', { title: 'Remove supplier' });
    if (!ok) return;
    removeSpecialSupplier(id);
    toast.success('Supplier removed.');
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission to add a supplier' : undefined}
            >
              {addLabel}
            </button>
          </div>
          {logSub === 'visa' && (
            <>
              <div className="info-bar">Visa partners handle E-visa applications, urgent processing (24–48hr), and business multi-entry visas for all nationalities.</div>
              <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['visa'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
            </>
          )}
          {logSub === 'fasttrack' && (
            <>
              <div className="info-bar">
                Airport fast track covers VIP arrival/departure lanes, immigration assistance, and lounge access — sorted by region: <b>North (HAN/HPH)</b> · <b>Central (HUI/DAD)</b> · <b>South (SGN/CXR/PQC)</b>.
              </div>
              <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['fasttrack'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
            </>
          )}
          {logSub === 'aviation' && (
            <>
              <div className="info-bar">Covers domestic scheduled airlines and private charter operators for helicopter, seaplane, and small fixed-wing aircraft.</div>
              <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['aviation'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission to add a supplier' : undefined}
            >
              {addLabel}
            </button>
          </div>
          <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['river', 'coastal', 'park'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission to add a supplier' : undefined}
            >
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {advSub === 'cycling' && 'Cycling suppliers: high-end road and mountain bikes, support vehicles, mobile maintenance crew.'}
            {advSub === 'trekking' && 'Trekking & camping gear rental: tents, sleeping bags, GPS trackers, portable radios, first-aid kits.'}
            {advSub === 'wildlife' && 'Wildlife & nature experts: ornithologists, marine biologists, karst geologists, wildlife trackers.'}
          </div>
          <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt([advSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission to add a supplier' : undefined}
            >
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {expSub === 'artisan' && 'Master artisans, cultural experts, musicians, and performers for private in-depth experiences.'}
            {expSub === 'wellness' && 'Luxury wellness partners: traditional medicine doctors, spa directors, meditation guides.'}
            {expSub === 'events' && 'Exclusive event & decor specialists: private beach dinners, floral designers, lantern lighting.'}
          </div>
          <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt([expSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
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
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission to add a supplier' : undefined}
            >
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
          <ExtGrid onAdd={canWrite ? () => openAdd() : undefined} items={getExt([perSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
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
