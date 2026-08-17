'use client';

import ProposalHotelRatesPanel from '@/components/tour-design/ProposalHotelRatesPanel';
import ProposalLayoutPicker from '@/components/tour-design/ProposalLayoutPicker';
import type { ProposalLayoutId } from '@/lib/proposals/proposal-layouts';
import type { ProposalHotelRate } from '@/lib/proposals/proposal-types';

interface Props {
  clientType: 'b2c' | 'b2b';
  hasContent: boolean;
  hasEdits: boolean;
  layoutId: ProposalLayoutId;
  onLayoutIdChange: (layoutId: ProposalLayoutId) => void;
  specialNotes: string;
  specialNotesPlaceholder: string;
  onSpecialNotesChange: (notes: string) => void;
  hotelRatesOptionA: ProposalHotelRate[];
  hotelRatesOptionB: ProposalHotelRate[];
  onHotelRatesAChange: (rates: ProposalHotelRate[]) => void;
  onHotelRatesBChange: (rates: ProposalHotelRate[]) => void;
  companyTemplateActive: boolean;
  onEditTemplate: () => void;
}

export default function ProposalExportSettings({
  clientType,
  hasContent,
  hasEdits,
  layoutId,
  onLayoutIdChange,
  specialNotes,
  specialNotesPlaceholder,
  onSpecialNotesChange,
  hotelRatesOptionA,
  hotelRatesOptionB,
  onHotelRatesAChange,
  onHotelRatesBChange,
  companyTemplateActive,
  onEditTemplate,
}: Props) {
  return (
    <div className="td-export-rail">
      {!hasContent && (
        <div className="td-export-settings-banner">
          Add experiences (Step 3), a package, or outline days before exporting a proposal.
        </div>
      )}

      <section className="td-export-group">
        <div className="td-export-group-hd">Layout</div>
        <ProposalLayoutPicker
          value={layoutId}
          onChange={onLayoutIdChange}
          disabled={!hasContent}
        />
      </section>

      <section className="td-export-group">
        <div className="td-export-group-hd">Content</div>
        <label className="lbl" style={{ display: 'block', marginBottom: 4 }}>
          Special Notes (shown on proposal)
        </label>
        <textarea
          rows={3}
          value={specialNotes}
          onChange={(e) => onSpecialNotesChange(e.target.value)}
          placeholder={specialNotesPlaceholder}
          style={{ width: '100%', fontSize: 12.5 }}
        />
      </section>

      {clientType === 'b2b' && (
        <section className="td-export-group">
          <details className="td-export-details" open>
            <summary className="td-export-group-hd td-export-details-sum">Hotel rates</summary>
            <div className="td-export-details-body">
              <ProposalHotelRatesPanel
                title="C. HOTELS — OPTION A (4★) — enter net rate per night"
                rates={hotelRatesOptionA}
                onChange={onHotelRatesAChange}
              />
              <ProposalHotelRatesPanel
                title="C. HOTELS — OPTION B (5★ Luxury) — enter hotel names & net rates"
                rates={hotelRatesOptionB}
                onChange={onHotelRatesBChange}
                editableHotelName
                emptyHint="Option B rows appear once Outline hotels are detected (same stays as Option A)."
              />
            </div>
          </details>
        </section>
      )}

      <section className="td-export-group">
        <div className="td-export-group-hd">Template</div>
        <div className="td-export-template-row">
          <span className={`td-export-pill${companyTemplateActive ? ' is-ready' : ''}`}>
            {companyTemplateActive ? 'Company template' : 'System defaults'}
          </span>
          <button
            type="button"
            className="btn btn-s btn-sm"
            onClick={onEditTemplate}
            disabled={!hasContent}
          >
            Edit Template{hasEdits ? ' •' : ''}
          </button>
        </div>
        <p className="td-export-template-note">
          {companyTemplateActive
            ? 'A saved company template is active for this client type.'
            : 'Using built-in system defaults. Customise copy and colours in Edit Template.'}
        </p>
      </section>
    </div>
  );
}
