'use client';

import ProposalHotelRatesPanel from '@/components/tour-design/ProposalHotelRatesPanel';
import ProposalLayoutPicker from '@/components/tour-design/ProposalLayoutPicker';
import { useLanguage } from '@/hooks/useLanguage';
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
  canWrite?: boolean;
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
  canWrite = true,
}: Props) {
  const { tp } = useLanguage();

  return (
    <div className="td-export-rail">
      {!hasContent && (
        <div className="td-export-settings-banner">
          {tp('tour-design', 'exportSettingsBanner')}
        </div>
      )}

      <section className="td-export-group">
        <div className="td-export-group-hd">{tp('tour-design', 'exportLayoutGroup')}</div>
        <ProposalLayoutPicker
          value={layoutId}
          onChange={onLayoutIdChange}
          disabled={!hasContent || !canWrite}
        />
      </section>

      <section className="td-export-group">
        <div className="td-export-group-hd">{tp('tour-design', 'exportContentGroup')}</div>
        <label className="lbl" style={{ display: 'block', marginBottom: 4 }}>
          {tp('tour-design', 'exportSpecialNotes')}
        </label>
        <textarea
          rows={3}
          value={specialNotes}
          onChange={(e) => onSpecialNotesChange(e.target.value)}
          placeholder={specialNotesPlaceholder}
          style={{ width: '100%', fontSize: 12.5 }}
          disabled={!canWrite}
        />
      </section>

      {clientType === 'b2b' && (
        <section className="td-export-group">
          <details className="td-export-details" open>
            <summary className="td-export-group-hd td-export-details-sum">{tp('tour-design', 'exportHotelRates')}</summary>
            <div className="td-export-details-body">
              <ProposalHotelRatesPanel
                title={tp('tour-design', 'exportHotelOptionA')}
                rates={hotelRatesOptionA}
                onChange={onHotelRatesAChange}
                disabled={!canWrite}
              />
              <ProposalHotelRatesPanel
                title={tp('tour-design', 'exportHotelOptionB')}
                rates={hotelRatesOptionB}
                onChange={onHotelRatesBChange}
                editableHotelName
                emptyHint={tp('tour-design', 'exportHotelOptionBHint')}
                disabled={!canWrite}
              />
            </div>
          </details>
        </section>
      )}

      <section className="td-export-group">
        <div className="td-export-group-hd">{tp('tour-design', 'exportTemplateGroup')}</div>
        <div className="td-export-template-row">
          <span className={`td-export-pill${companyTemplateActive ? ' is-ready' : ''}`}>
            {companyTemplateActive ? tp('tour-design', 'exportCompanyTemplate') : tp('tour-design', 'exportSystemDefaults')}
          </span>
          <button
            type="button"
            className="btn btn-s btn-sm"
            onClick={onEditTemplate}
            disabled={!hasContent || !canWrite}
          >
            {tp('tour-design', 'exportEditTemplate')}{hasEdits ? ' •' : ''}
          </button>
        </div>
        <p className="td-export-template-note">
          {companyTemplateActive
            ? tp('tour-design', 'exportTemplateActiveNote')
            : tp('tour-design', 'exportTemplateDefaultNote')}
        </p>
      </section>
    </div>
  );
}
