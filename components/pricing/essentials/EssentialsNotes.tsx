'use client';

import { useMemo } from 'react';
import EditableSection, { EditableCard } from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type { EssNote, PricingSetting } from '@/lib/pricing/catalog-types';
import EmptyState from '@/components/EmptyState';

type Props = {
  notes: EssNote[];
  settings: PricingSetting[];
  onPatchNote: (id: string, patch: Partial<EssNote>) => Promise<void>;
  onPatchSetting: (id: string, patch: Partial<PricingSetting>) => Promise<void>;
};

export default function EssentialsNotes({ notes, settings, onPatchNote, onPatchSetting }: Props) {
  const sheets = useMemo(() => {
    const map = new Map<string, Map<string, EssNote[]>>();
    for (const note of notes) {
      if (note.section === 'Properties without rates') continue;
      const sheet = note.sheet.trim() || 'Notes';
      const sections = map.get(sheet) ?? new Map<string, EssNote[]>();
      const section = note.section || 'General';
      const bucket = sections.get(section) ?? [];
      bucket.push(note);
      sections.set(section, bucket);
      map.set(sheet, sections);
    }
    return [...map.entries()];
  }, [notes]);

  return (
    <div>
      {settings.length > 0 && (
        <EditableCard
          title="Pricing inputs"
          meta={<span className="pcx-muted">Markup, VAT and exchange rate used across the workbook</span>}
        >
          {({ editing }) => (
            <div className="card-body">
              <div className="pcx-setting-grid">
                {settings.map((setting) => (
                  <div key={setting.id} className="pcx-setting">
                    <span className="pcx-setting-label">{setting.label || setting.key}</span>
                    <InlineEdit
                      editing={editing}
                      value={setting.valueNum ?? setting.valueText}
                      type={setting.valueNum != null ? 'number' : 'text'}
                      onSave={(v) =>
                        onPatchSetting(setting.id, {
                          valueNum: typeof v === 'number' ? v : null,
                          valueText: String(v ?? ''),
                        })
                      }
                    />
                    <span className="pcx-setting-sheet">{setting.sheet.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </EditableCard>
      )}

      {sheets.map(([sheet, sections]) => (
        <section key={sheet} className="card pcx-notes-card">
          <div className="card-hd">
            <span className="card-title">{sheet}</span>
          </div>
          <div className="card-body pcx-notes-body">
            {[...sections.entries()].map(([section, list]) => (
              <EditableSection key={section} title={section}>
                {({ editing }) => (
                  <ul className="pcx-note-list">
                    {list.map((note) => (
                      <li key={note.id}>
                        <span className="pcx-note-label">
                          <InlineEdit
                            editing={editing}
                            value={note.label}
                            onSave={(v) => onPatchNote(note.id, { label: String(v ?? '') })}
                          />
                        </span>
                        {(note.detail || editing) && (
                          <span className="pcx-note-detail">
                            <InlineEdit
                              editing={editing}
                              value={note.detail}
                              type="multiline"
                              placeholder="Add detail"
                              onSave={(v) => onPatchNote(note.id, { detail: String(v ?? '') })}
                            />
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </EditableSection>
            ))}
          </div>
        </section>
      ))}

      {!sheets.length && !settings.length && (
        <EmptyState
          className="crm-empty-state--flush"
          size="compact"
          variant="notes"
          title="No guidelines or notes yet"
          description="Import the Essentials workbook to populate guidelines and inputs."
        />
      )}
    </div>
  );
}
