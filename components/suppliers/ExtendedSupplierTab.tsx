'use client';

import { useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import ExtSupplierCard from '@/components/suppliers/ExtSupplierCard';
import ExtendedSupplierFormModal from '@/components/suppliers/ExtendedSupplierFormModal';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useExtendedSupplierMutations } from '@/hooks/useExtendedSupplierMutations';
import { useStore } from '@/hooks/useStore';
import { filterExtendedSuppliers, preselectCategoryForTab, type SupplierFilters } from '@/lib/suppliers/supplier-utils';
import type { ExtendedSupplier } from '@/lib/types';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';
import { useLanguage } from '@/hooks/useLanguage';

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
  emptyTitle,
  emptyDesc,
  addLabel,
}: {
  items: ExtendedSupplier[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  emptyTitle: string;
  emptyDesc: string;
  addLabel: string;
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
        title={emptyTitle}
        description={emptyDesc}
        action={
          onAdd && (
            <button type="button" className="btn btn-p btn-sm" onClick={onAdd}>
              {addLabel}
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
  const { tp } = useLanguage();
  const specialSuppliers = useStore((s) => s.specialSuppliers);
  const { createSupplier, patchSupplier, deleteSupplier } = useExtendedSupplierMutations();

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

  const handleSave = async (supplier: ExtendedSupplier) => {
    if (formMode === 'edit' && editId) {
      const result = await patchSupplier(editId, supplier);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(tp('suppliers', 'toastSupplierUpdated'));
      return;
    }
    const result = await createSupplier(supplier);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(tp('suppliers', 'toastSupplierCreated'));
  };

  const deleteExt = async (id: string) => {
    const ok = await confirmDialog(tp('suppliers', 'confirmRemoveSupplier'), {
      title: tp('suppliers', 'confirmRemoveSupplierTitle'),
    });
    if (!ok) return;
    const result = await deleteSupplier(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(tp('suppliers', 'toastSupplierRemoved'));
  };

  const addLabel = useMemo(() => {
    const labels: Record<ExtendedSection, keyof typeof import('@/lib/i18n/pages/suppliers').SUPPLIERS.en> = {
      logistics: 'addLogisticsSupplier',
      water: 'addWaterSupplier',
      adventure: 'addAdventureSupplier',
      experience: 'addExperienceProvider',
      personnel: 'addPersonnelSupplier',
    };
    return tp('suppliers', labels[section]);
  }, [section, tp]);

  const emptyProps = {
    emptyTitle: tp('suppliers', 'emptySuppliers'),
    emptyDesc: tp('suppliers', 'emptySuppliersDesc'),
    addLabel: tp('suppliers', 'addSupplierShort'),
  };

  return (
    <>
      {section === 'logistics' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['visa', tp('suppliers', 'subVisa')],
                  ['fasttrack', tp('suppliers', 'subFasttrack')],
                  ['aviation', tp('suppliers', 'subAviation')],
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
              title={!canWrite ? tp('suppliers', 'permAddSupplier') : undefined}
            >
              {addLabel}
            </button>
          </div>
          {logSub === 'visa' && (
            <>
              <div className="info-bar">{tp('suppliers', 'infoVisa')}</div>
              <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['visa'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
            </>
          )}
          {logSub === 'fasttrack' && (
            <>
              <div className="info-bar">{tp('suppliers', 'infoFasttrack')}</div>
              <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['fasttrack'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
            </>
          )}
          {logSub === 'aviation' && (
            <>
              <div className="info-bar">{tp('suppliers', 'infoAviation')}</div>
              <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['aviation'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
            </>
          )}
        </>
      )}

      {section === 'water' && (
        <>
          <div className="sup-sub-bar">
            <div className="info-bar" style={{ margin: 0, flex: 1 }}>
              {tp('suppliers', 'infoWater')}
            </div>
            <button
              className="btn btn-p btn-sm"
              type="button"
              onClick={() => openAdd()}
              disabled={!canWrite}
              title={!canWrite ? tp('suppliers', 'permAddSupplier') : undefined}
            >
              {addLabel}
            </button>
          </div>
          <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt(['river', 'coastal', 'park'])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
        </>
      )}

      {section === 'adventure' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['cycling', tp('suppliers', 'subCycling')],
                  ['trekking', tp('suppliers', 'subTrekking')],
                  ['wildlife', tp('suppliers', 'subWildlife')],
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
              title={!canWrite ? tp('suppliers', 'permAddSupplier') : undefined}
            >
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {advSub === 'cycling' && tp('suppliers', 'infoCycling')}
            {advSub === 'trekking' && tp('suppliers', 'infoTrekking')}
            {advSub === 'wildlife' && tp('suppliers', 'infoWildlife')}
          </div>
          <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt([advSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
        </>
      )}

      {section === 'experience' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['artisan', tp('suppliers', 'subArtisan')],
                  ['wellness', tp('suppliers', 'subWellness')],
                  ['events', tp('suppliers', 'subEvents')],
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
              title={!canWrite ? tp('suppliers', 'permAddSupplier') : undefined}
            >
              {addLabel}
            </button>
          </div>
          <div className="info-bar">
            {expSub === 'artisan' && tp('suppliers', 'infoArtisan')}
            {expSub === 'wellness' && tp('suppliers', 'infoWellness')}
            {expSub === 'events' && tp('suppliers', 'infoEvents')}
          </div>
          <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt([expSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
        </>
      )}

      {section === 'personnel' && (
        <>
          <div className="sup-sub-bar">
            <div className="tabs sup-sub-tabs">
              {(
                [
                  ['specguide', tp('suppliers', 'subSpecguide')],
                  ['media', tp('suppliers', 'subMedia')],
                  ['safety', tp('suppliers', 'subSafety')],
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
              title={!canWrite ? tp('suppliers', 'permAddSupplier') : undefined}
            >
              {addLabel}
            </button>
          </div>
          {perSub === 'specguide' && (
            <div className="search-row" style={{ marginBottom: 10 }}>
              <select value={perLang} onChange={(e) => setPerLang(e.target.value)}>
                <option value="">{tp('suppliers', 'filterAllLanguages')}</option>
                <option value="EN">🇬🇧 English</option>
                <option value="FR">🇫🇷 French</option>
                <option value="DE">🇩🇪 German</option>
              </select>
            </div>
          )}
          <div className="info-bar">{tp('suppliers', 'infoPersonnel')}</div>
          <ExtGrid {...emptyProps} onAdd={canWrite ? () => openAdd() : undefined} items={getExt([perSub])} onEdit={canWrite ? openEdit : undefined} onDelete={canWrite ? deleteExt : undefined} />
        </>
      )}

      <ExtendedSupplierFormModal
        open={formOpen}
        mode={formMode}
        supplier={editSupplier}
        defaultCat={defaultCat}
        existing={specialSuppliers}
        onClose={() => setFormOpen(false)}
        onSave={(supplier) => {
          void handleSave(supplier);
        }}
      />
    </>
  );
}
