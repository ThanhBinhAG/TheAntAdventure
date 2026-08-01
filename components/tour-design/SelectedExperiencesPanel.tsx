'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fmt } from '@/lib/constants';
import {
  buildItinerary,
  displayDayNumber,
  effectiveDuration,
  firstDayNumberForProduct,
  formatCompactDayBadge,
  formatTravelStartTitle,
  inferredPace,
  isoDateForDay,
  stripMarkdown,
  totalDurationDays,
} from '@/lib/tour-design/tour-itinerary';
import { resolveProductPhotos } from '@/lib/gallery/tour-photos';
import { paxToExactN, sumSellForProducts } from '@/lib/tour-design/tour-pricing';
import type { TourBrief, GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { ExperienceOverride, Product } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import PhotoStack from '@/components/tour-design/PhotoStack';

const DESC_CLAMP_CHARS = 500;

/** Patch may use null to clear dayIndex / durOverride. */
export type OverridePatch = {
  desc?: string;
  date?: string;
  clientNote?: string;
  dayIndex?: number | null;
  durOverride?: 'full' | 'half' | null;
};

interface Props {
  brief: TourBrief;
  selectedProducts: Product[];
  photos: GalleryPhoto[];
  onToggleProduct: (code: string) => void;
  onReorderCodes: (codes: string[]) => void;
  experienceOverrides: Record<string, ExperienceOverride>;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}

export default function SelectedExperiencesPanel({
  brief,
  selectedProducts,
  photos,
  onToggleProduct,
  onReorderCodes,
  experienceOverrides,
  onPatchOverride,
}: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const codes = selectedProducts.map((p) => p.code);
  const totalD = totalDurationDays(selectedProducts, experienceOverrides);
  const pn = paxToExactN(brief.pax);
  const totalSell = sumSellForProducts(codes, pn);

  const { addons, days } = useMemo(
    () => buildItinerary(selectedProducts, experienceOverrides),
    [selectedProducts, experienceOverrides]
  );

  const maxDayOptions = Math.max(
    days.length,
    Math.ceil(totalD) || 1,
    ...Object.values(experienceOverrides).map((o) => o.dayIndex ?? 0),
    7
  );

  const timedProducts = useMemo(
    () => selectedProducts.filter((p) => effectiveDuration(p, experienceOverrides[p.code]) > 0),
    [selectedProducts, experienceOverrides]
  );
  const timedIds = useMemo(() => timedProducts.map((p) => p.code), [timedProducts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function aiRecommend() {
    const recs = selectedProducts.length
      ? `Based on ${brief.style} style and ${brief.pax} pax:\n\n• Consider pairing half-day experiences on the same day\n• Add a culinary experience every 2–3 days\n• ${brief.region === 'north' ? 'Include Halong Bay for signature scenery' : brief.region === 'central' ? 'Hue citadel + Hoi An evenings work well' : 'Mekong Delta pairs with HCMC city highlights'}`
      : `For a ${brief.style} ${brief.duration} tour (${brief.pax} pax):\n\n• Start with arrival transfer + orientation walk\n• Add 1 signature experience per region\n• Balance active days with relaxed hotel afternoons`;
    setAiResult(recs);
    setAiOpen(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = timedIds.indexOf(String(active.id));
    const newIndex = timedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const nextTimed = arrayMove(timedProducts, oldIndex, newIndex).map((p) => p.code);
    const addonCodes = selectedProducts
      .filter((p) => effectiveDuration(p, experienceOverrides[p.code]) === 0)
      .map((p) => p.code);
    const timedSet = new Set(nextTimed);
    let ti = 0;
    const nextCodes = selectedProducts.map((p) => {
      if (timedSet.has(p.code)) return nextTimed[ti++];
      return p.code;
    });
    while (ti < nextTimed.length) nextCodes.push(nextTimed[ti++]);
    for (const c of addonCodes) {
      if (!nextCodes.includes(c)) nextCodes.push(c);
    }
    onReorderCodes(nextCodes);
  }

  if (!selectedProducts.length) {
    return (
      <div className="card td-exp-right-card">
        <div className="card-hd">
          <span className="card-title">✓ Tour Selected (0) — 0D</span>
          <button className="btn btn-pu btn-sm" type="button" onClick={aiRecommend}>
            ✦ AI Recommend
          </button>
        </div>
        <EmptyState
          className="crm-empty-state--flush"
          size="compact"
          variant="products"
          title="No experiences selected"
          description="Click experiences on the left to build your tailor-made tour. A day-by-day draft will appear here."
        />
      </div>
    );
  }

  return (
    <div className="card td-exp-right-card">
      <div className="card-hd">
        <div>
          <span className="card-title">
            ✓ Tour Selected ({selectedProducts.length}) — {totalD}D
          </span>
          <div className="td-sel-meta">
            {selectedProducts.length} exp · {totalD}D · ${fmt(totalSell)}/pax
          </div>
        </div>
        <button className="btn btn-pu btn-sm" type="button" onClick={aiRecommend}>
          ✦ AI Recommend
        </button>
      </div>

      {aiOpen && (
        <div className="td-ai-panel" style={{ borderRadius: 0, borderTop: '1.5px solid #d8b4fe', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ AI Experience Recommendations</span>
            <button type="button" onClick={() => setAiOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
              ×
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{aiResult}</div>
        </div>
      )}

      <div className="td-sel-body">
        <div className="td-section-lbl">Selected Experiences</div>
        {selectedProducts.map((p, i) => (
          <div key={p.code} className="td-sel-chip">
            <div className="td-sel-chip-num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            </div>
            <button type="button" className="td-sel-remove" onClick={() => onToggleProduct(p.code)}>
              ×
            </button>
          </div>
        ))}

        {addons.length > 0 && (
          <>
            <div className="td-section-lbl td-section-divider">Tour Services / Add-ons</div>
            {addons.map((item) => (
              <AddonCard
                key={item.code}
                item={item}
                override={experienceOverrides[item.code]}
                onPatchOverride={onPatchOverride}
              />
            ))}
          </>
        )}

        {(timedProducts.length > 0 || addons.length === 0) && (
          <div className="td-section-lbl td-section-divider">
            {formatTravelStartTitle(brief.startDate, brief.travelMonth)}
            <span style={{ fontSize: 9.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: 'var(--m)' }}>
              (drag · edit day / pace)
            </span>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={timedIds} strategy={verticalListSortingStrategy}>
            {timedProducts.map((item) => {
              const packedDay = firstDayNumberForProduct(days, item.code) ?? 1;
              return (
                <SortableTourCard
                  key={item.code}
                  item={item}
                  brief={brief}
                  photos={photos}
                  packedDay={packedDay}
                  maxDayOptions={maxDayOptions}
                  override={experienceOverrides[item.code]}
                  onPatchOverride={onPatchOverride}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableTourCard({
  item,
  brief,
  photos,
  packedDay,
  maxDayOptions,
  override,
  onPatchOverride,
}: {
  item: Product;
  brief: TourBrief;
  photos: GalleryPhoto[];
  packedDay: number;
  maxDayOptions: number;
  override?: ExperienceOverride;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.code,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dayN = displayDayNumber(packedDay, override);
  const dayPhotos = resolveProductPhotos(item, photos, 2);

  return (
    <div ref={setNodeRef} style={style} className={`td-sortable-card${isDragging ? ' dragging' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <button type="button" className="td-drag-handle" aria-label="Drag to reorder" {...attributes} {...listeners}>
          ⋮⋮
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TourCardBody
            item={item}
            brief={brief}
            packedDay={packedDay}
            dayN={dayN}
            maxDayOptions={maxDayOptions}
            override={override}
            onPatchOverride={onPatchOverride}
            photos={dayPhotos}
          />
        </div>
      </div>
    </div>
  );
}

function AddonCard({
  item,
  override,
  onPatchOverride,
}: {
  item: Product;
  override?: ExperienceOverride;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}) {
  return (
    <div className="td-draft-day" style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)', marginBottom: 3 }}>{item.name}</div>
      <DescEditor
        code={item.code}
        catalogDesc={item.desc}
        overrideDesc={override?.desc}
        onPatchOverride={onPatchOverride}
      />
      <ClientNotesField
        code={item.code}
        value={override?.clientNote ?? ''}
        onPatchOverride={onPatchOverride}
      />
    </div>
  );
}

function TourCardBody({
  item,
  brief,
  packedDay,
  dayN,
  maxDayOptions,
  override,
  onPatchOverride,
  photos,
}: {
  item: Product;
  brief: TourBrief;
  packedDay: number;
  dayN: number;
  maxDayOptions: number;
  override?: ExperienceOverride;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
  photos: ReturnType<typeof resolveProductPhotos>;
}) {
  return (
    <div className="td-draft-day-grid td-draft-day-grid-exp">
      <div>
        <DayScheduleEditor
          code={item.code}
          item={item}
          brief={brief}
          packedDay={packedDay}
          dayN={dayN}
          maxDayOptions={maxDayOptions}
          override={override}
          onPatchOverride={onPatchOverride}
        />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)', marginBottom: 3 }}>{item.name}</div>
        <DescEditor
          code={item.code}
          catalogDesc={item.desc}
          overrideDesc={override?.desc}
          onPatchOverride={onPatchOverride}
        />
        <ClientNotesField
          code={item.code}
          value={override?.clientNote ?? ''}
          onPatchOverride={onPatchOverride}
        />
      </div>
      <PhotoStack photos={photos} productCode={item.code} height={100} />
    </div>
  );
}

function DayScheduleEditor({
  code,
  item,
  brief,
  packedDay,
  dayN,
  maxDayOptions,
  override,
  onPatchOverride,
}: {
  code: string;
  item: Product;
  brief: TourBrief;
  packedDay: number;
  dayN: number;
  maxDayOptions: number;
  override?: ExperienceOverride;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}) {
  const [editing, setEditing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pace = override?.durOverride ?? inferredPace(item);
  const autoIso = isoDateForDay(brief.startDate, brief.travelMonth, dayN);
  const dateValue = override?.date?.trim() || autoIso;

  const badge = formatCompactDayBadge(brief.startDate, brief.travelMonth, dayN, {
    overrideDate: override?.date,
    pace,
  });

  useEffect(() => {
    if (!editing) return;
    function onDoc(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [editing]);

  function setDay(n: number) {
    const iso = isoDateForDay(brief.startDate, brief.travelMonth, n);
    onPatchOverride(code, { dayIndex: n, date: iso || override?.date || '' });
  }

  function setPace(next: 'full' | 'half') {
    onPatchOverride(code, { durOverride: next });
  }

  function resetAll() {
    onPatchOverride(code, { date: '', dayIndex: null, durOverride: null });
    setEditing(false);
  }

  const hasOverrides = !!(
    override?.date?.trim() ||
    override?.dayIndex ||
    override?.durOverride
  );

  if (editing) {
    return (
      <div className="td-day-edit-panel" ref={panelRef}>
        <div className="td-day-edit-row">
          <label className="td-day-edit-lbl" htmlFor={`day-sel-${code}`}>
            Day
          </label>
          <select
            id={`day-sel-${code}`}
            className="td-day-edit-select"
            value={dayN}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {Array.from({ length: maxDayOptions }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Day {n}
                {n === packedDay && !override?.dayIndex ? ' (auto)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="td-day-edit-row">
          <span className="td-day-edit-lbl">Pace</span>
          <div className="td-day-seg" role="group" aria-label="Pace">
            <button
              type="button"
              className={pace === 'full' ? 'on' : ''}
              onClick={() => setPace('full')}
            >
              Full Day
            </button>
            <button
              type="button"
              className={pace === 'half' ? 'on' : ''}
              onClick={() => setPace('half')}
            >
              Half Day
            </button>
          </div>
        </div>
        <div className="td-day-edit-row">
          <label className="td-day-edit-lbl" htmlFor={`day-date-${code}`}>
            Date
          </label>
          <input
            id={`day-date-${code}`}
            type="date"
            className="td-day-date-input"
            value={dateValue}
            onChange={(e) => onPatchOverride(code, { date: e.target.value || '' })}
          />
        </div>
        <div className="td-day-edit-actions">
          <button type="button" onClick={() => setEditing(false)}>
            Done
          </button>
          {hasOverrides && (
            <button type="button" className="muted" onClick={resetAll}>
              Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="td-day-badge td-day-badge-btn"
      title="Edit day, pace, and date"
      onClick={() => setEditing(true)}
    >
      {badge}
    </button>
  );
}

function DescEditor({
  code,
  catalogDesc,
  overrideDesc,
  onPatchOverride,
}: {
  code: string;
  catalogDesc: string;
  overrideDesc?: string;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}) {
  const displaySource = overrideDesc !== undefined && overrideDesc !== '' ? overrideDesc : catalogDesc;
  const plain = stripMarkdown(displaySource);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(plain);
  const [wasEditing, setWasEditing] = useState(false);

  if (editing !== wasEditing) {
    setWasEditing(editing);
    if (editing) setDraft(plain);
  }

  const tooLong = plain.length > DESC_CLAMP_CHARS;
  const shown = !expanded && tooLong ? plain.slice(0, DESC_CLAMP_CHARS) + '…' : plain;

  function commit() {
    const trimmed = draft.trim();
    const catalogPlain = stripMarkdown(catalogDesc).trim();
    if (trimmed === catalogPlain) {
      onPatchOverride(code, { desc: '' });
    } else {
      onPatchOverride(code, { desc: draft });
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <textarea
          className="td-draft-desc-edit"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          autoFocus
        />
        <div className="td-draft-desc-actions">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="td-draft-desc"
        onClick={() => setEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditing(true);
          }
        }}
        title="Click to edit description"
        style={{ cursor: 'text' }}
      >
        {shown}
      </div>
      <div className="td-draft-desc-actions">
        {tooLong && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <button type="button" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    </div>
  );
}

function ClientNotesField({
  code,
  value,
  onPatchOverride,
}: {
  code: string;
  value: string;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  if (value !== previousValue) {
    setPreviousValue(value);
    setDraft(value);
  }

  return (
    <div className="td-client-notes">
      <label htmlFor={`client-note-${code}`}>Customer notes</label>
      <textarea
        id={`client-note-${code}`}
        value={draft}
        placeholder="Notes for the client (included in export)…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onPatchOverride(code, { clientNote: draft });
        }}
      />
    </div>
  );
}
