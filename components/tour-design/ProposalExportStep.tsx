'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  assembleProposalDoc,
  extractHotelBlocksFromOutline,
  seedOptionBHotelRates,
} from '@/lib/proposals/proposal-assembler';
import {
  fetchCompanyProposalTemplatesClient,
  saveCompanyProposalTemplateClient,
} from '@/lib/proposals/proposal-company-template-client';
import {
  emptyCompanyTemplatesMap,
  mergeProposalTemplateLayers,
  type CompanyTemplatesMap,
} from '@/lib/proposals/proposal-company-template';
import {
  hasProposalTemplateOverrides,
  type ProposalTemplateOverrides,
} from '@/lib/proposals/proposal-content-overrides';
import { downloadProposalWord } from '@/lib/proposals/proposal-html';
import type { GalleryPhoto, TourBrief } from '@/lib/tour-design/tour-design-types';
import type { ProposalHotelRatesPersist } from '@/lib/tour-design/tour-draft-utils';
import type { ExperienceOverride, Hotel, Product, TourOutlineDay } from '@/lib/types';
import type { ProposalDoc, ProposalHotelRate } from '@/lib/proposals/proposal-types';
import type { ProposalLayoutId } from '@/lib/proposals/proposal-layouts';
import { normalizeProposalLayoutId } from '@/lib/proposals/proposal-layouts';
import ProposalEditorModal from '@/components/tour-design/ProposalEditorModal';
import ProposalExportActionBar from '@/components/tour-design/ProposalExportActionBar';
import ProposalExportPreview from '@/components/tour-design/ProposalExportPreview';
import ProposalExportSettings from '@/components/tour-design/ProposalExportSettings';
import { toast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

function formatPdfDownloadError(message: string): string {
  if (/libnspr4|libnss3|browser process|Code:\s*127|shared libraries|could not start Chromium/i.test(message)) {
    return `${message}\n\nWSL/Linux: run \`bash scripts/setup-pdf-deps-wsl.sh\`, restart \`npm run dev\`, or use Print / Save PDF.`;
  }
  return message;
}

interface Props {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  customerName: string;
  selectedProducts: Product[];
  selectedCodes: string[];
  selectedPackageId: string | null;
  experienceOverrides?: Record<string, ExperienceOverride>;
  outlineRows: TourOutlineDay[];
  markupPct: number;
  leadId?: string;
  galleryPhotos?: GalleryPhoto[];
  hotelsCatalog?: Hotel[];
  templateOverrides: ProposalTemplateOverrides;
  specialNotes: string;
  hotelRates: ProposalHotelRatesPersist | null;
  layoutId: ProposalLayoutId;
  onTemplateOverridesChange: (overrides: ProposalTemplateOverrides) => void;
  onSpecialNotesChange: (notes: string) => void;
  onHotelRatesChange: (rates: ProposalHotelRatesPersist) => void;
  onLayoutIdChange: (layoutId: ProposalLayoutId) => void;
  onReset: () => void;
  onBack: () => void;
  canWrite?: boolean;
}

export default function ProposalExportStep({
  brief,
  clientType,
  customerName,
  selectedProducts,
  selectedCodes,
  selectedPackageId,
  experienceOverrides = {},
  outlineRows,
  markupPct,
  leadId,
  galleryPhotos = [],
  hotelsCatalog = [],
  templateOverrides,
  specialNotes,
  hotelRates,
  layoutId,
  onTemplateOverridesChange,
  onSpecialNotesChange,
  onHotelRatesChange,
  onLayoutIdChange,
  onReset,
  onBack,
  canWrite = true,
}: Props) {
  const { tp } = useLanguage();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const hotelRateSeed = useMemo(() => {
    const optionA = extractHotelBlocksFromOutline(brief, outlineRows);
    return {
      optionA,
      optionB: seedOptionBHotelRates(optionA, hotelsCatalog),
    };
  }, [brief, outlineRows, hotelsCatalog]);
  const hotelRateSeedKey = useMemo(() => JSON.stringify(hotelRateSeed), [hotelRateSeed]);

  const hotelRatesOptionA =
    hotelRates && (!hotelRates.seedKey || hotelRates.seedKey === hotelRateSeedKey)
      ? hotelRates.optionA
      : hotelRateSeed.optionA;
  const hotelRatesOptionB =
    hotelRates && (!hotelRates.seedKey || hotelRates.seedKey === hotelRateSeedKey)
      ? hotelRates.optionB
      : hotelRateSeed.optionB;

  const [editorOpen, setEditorOpen] = useState(false);
  const [companyTemplates, setCompanyTemplates] = useState<CompanyTemplatesMap>(emptyCompanyTemplatesMap);
  const [savingCompany, setSavingCompany] = useState(false);
  const prevHotelSeedKeyRef = useRef(hotelRateSeedKey);
  const persistedSeedKey = hotelRates?.seedKey;

  useEffect(() => {
    let cancelled = false;
    void fetchCompanyProposalTemplatesClient().then((map) => {
      if (!cancelled) setCompanyTemplates(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prevHotelSeedKeyRef.current === hotelRateSeedKey) return;
    prevHotelSeedKeyRef.current = hotelRateSeedKey;
    onHotelRatesChange({
      optionA: hotelRateSeed.optionA,
      optionB: hotelRateSeed.optionB,
      seedKey: hotelRateSeedKey,
    });
  }, [hotelRateSeedKey, hotelRateSeed, onHotelRatesChange]);

  // Drop stale persisted rates when seed fingerprint no longer matches.
  useEffect(() => {
    if (!persistedSeedKey || persistedSeedKey === hotelRateSeedKey) return;
    prevHotelSeedKeyRef.current = hotelRateSeedKey;
    onHotelRatesChange({
      optionA: hotelRateSeed.optionA,
      optionB: hotelRateSeed.optionB,
      seedKey: hotelRateSeedKey,
    });
  }, [persistedSeedKey, hotelRateSeedKey, hotelRateSeed, onHotelRatesChange]);

  const updateHotelRatesA = useCallback(
    (next: ProposalHotelRate[]) => {
      onHotelRatesChange({ optionA: next, optionB: hotelRatesOptionB, seedKey: hotelRateSeedKey });
    },
    [hotelRatesOptionB, hotelRateSeedKey, onHotelRatesChange]
  );

  const updateHotelRatesB = useCallback(
    (next: ProposalHotelRate[]) => {
      onHotelRatesChange({ optionA: hotelRatesOptionA, optionB: next, seedKey: hotelRateSeedKey });
    },
    [hotelRatesOptionA, hotelRateSeedKey, onHotelRatesChange]
  );

  const assembledDoc: ProposalDoc = useMemo(
    () =>
      assembleProposalDoc({
        brief,
        clientType,
        customerName,
        outlineRows,
        products: selectedProducts,
        selectedCodes,
        selectedPackageId,
        markupPct,
        leadId,
        hotelRatesOptionA,
        hotelRatesOptionB,
        specialNotesOverride: specialNotes || undefined,
        logoUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/Logo-3.svg`,
        galleryPhotos,
        hotelsCatalog,
        experienceOverrides,
      }),
    [
      brief,
      clientType,
      customerName,
      outlineRows,
      selectedProducts,
      selectedCodes,
      selectedPackageId,
      markupPct,
      leadId,
      hotelRatesOptionA,
      hotelRatesOptionB,
      specialNotes,
      galleryPhotos,
      hotelsCatalog,
      experienceOverrides,
    ]
  );

  const companyFields = companyTemplates[clientType].fields;
  const proposalDoc = useMemo(
    () => ({
      ...mergeProposalTemplateLayers(assembledDoc, companyFields, templateOverrides),
      layoutId: normalizeProposalLayoutId(layoutId),
    }),
    [assembledDoc, companyFields, templateOverrides, layoutId]
  );

  const hasEdits =
    hasProposalTemplateOverrides(templateOverrides) || companyTemplates[clientType].source === 'company';

  const hasContent = selectedProducts.length > 0 || selectedPackageId || outlineRows.length > 0;

  const downloadPdf = useCallback(async () => {
    if (!hasContent) {
      toast.warning(tp('tour-design', 'exportNoContentWarning'));
      return;
    }
    setPdfLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalDoc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalDoc.quoteRef}-${(proposalDoc.customerName || 'proposal').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(formatPdfDownloadError(e instanceof Error ? e.message : tp('tour-design', 'exportPdfPrintFailed')));
    } finally {
      setPdfLoading(false);
    }
  }, [hasContent, proposalDoc, tp]);

  /** Open Puppeteer PDF in a new tab for print — avoids browser date/URL/title chrome. */
  const printViaPdf = useCallback(async () => {
    if (!hasContent) {
      toast.warning(tp('tour-design', 'exportNoContentPrintWarning'));
      return;
    }
    setPdfLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proposals/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalDoc }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        URL.revokeObjectURL(url);
        throw new Error(tp('tour-design', 'exportPopupBlocked'));
      }
      // Revoke after the viewer has loaded the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(formatPdfDownloadError(e instanceof Error ? e.message : tp('tour-design', 'exportPdfPrintFailed')));
    } finally {
      setPdfLoading(false);
    }
  }, [hasContent, proposalDoc, tp]);

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">{tp('tour-design', 'exportStepTitle')}</span>
        <span style={{ fontSize: 11, color: 'var(--m)' }}>
          {clientType === 'b2b' ? tp('tour-design', 'exportB2bLabel') : tp('tour-design', 'exportB2cLabel')} · {proposalDoc.quoteRef}
        </span>
      </div>
      <div className="card-body td-export-body">
        <div className="td-export-workspace">
          <ProposalExportSettings
            clientType={clientType}
            hasContent={!!hasContent}
            hasEdits={hasEdits}
            layoutId={layoutId}
            onLayoutIdChange={onLayoutIdChange}
            specialNotes={specialNotes}
            specialNotesPlaceholder={brief.specialRequests || tp('tour-design', 'exportSpecialNotesPlaceholder')}
            onSpecialNotesChange={onSpecialNotesChange}
            hotelRatesOptionA={hotelRatesOptionA}
            hotelRatesOptionB={hotelRatesOptionB}
            onHotelRatesAChange={updateHotelRatesA}
            onHotelRatesBChange={updateHotelRatesB}
            companyTemplateActive={companyTemplates[clientType].source === 'company'}
            onEditTemplate={() => setEditorOpen(true)}
            canWrite={canWrite}
          />
          <ProposalExportPreview
            proposalDoc={proposalDoc}
            layoutId={normalizeProposalLayoutId(layoutId)}
            hasContent={!!hasContent}
          />
        </div>

        <ProposalEditorModal
          open={editorOpen}
          doc={proposalDoc}
          companyByVariant={{
            b2c: companyTemplates.b2c.fields,
            b2b: companyTemplates.b2b.fields,
          }}
          companySourceByVariant={{
            b2c: companyTemplates.b2c.source,
            b2b: companyTemplates.b2b.source,
          }}
          origin={typeof window !== 'undefined' ? window.location.origin : ''}
          savingCompany={savingCompany}
          onClose={() => setEditorOpen(false)}
          onSaveQuote={(next) => {
            onTemplateOverridesChange(next);
          }}
          onSaveCompany={async (variant, fields) => {
            setSavingCompany(true);
            try {
              const next = await saveCompanyProposalTemplateClient(variant, fields);
              setCompanyTemplates(next);
            } finally {
              setSavingCompany(false);
            }
          }}
        />

        <ProposalExportActionBar
          hasContent={!!hasContent}
          pdfLoading={pdfLoading}
          error={error}
          onDownloadPdf={() => void downloadPdf()}
          onPrintPdf={() => void printViaPdf()}
          onDownloadWord={() => downloadProposalWord(proposalDoc, window.location.origin)}
          onBack={onBack}
          onReset={onReset}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}
