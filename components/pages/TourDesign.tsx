'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmt } from '@/lib/constants';
import { nextLeadId } from '@/lib/customers/customer-onboarding';
import { formatLeadTravelMonth } from '@/lib/sales/sales-lead-utils';
import { REG_LABELS } from '@/lib/core/page-helpers';
import { useStore } from '@/hooks/useStore';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import ClientBriefStep from '@/components/tour-design/ClientBriefStep';
import OutlineStep from '@/components/tour-design/OutlineStep';
import TourExperiencesStep from '@/components/tour-design/TourExperiencesStep';
import PricingStep from '@/components/tour-design/PricingStep';
import ProposalExportStep from '@/components/tour-design/ProposalExportStep';
import type { OverridePatch } from '@/components/tour-design/SelectedExperiencesPanel';
import { TOUR_PACKAGES, type TourPackage } from '@/lib/seeds/tourPackages';
import { getPackageSellPerPax } from '@/lib/proposals/proposal-assembler';
import { customerToBrief } from '@/lib/customers/customer-to-brief';
import { isExperiencesBlocked } from '@/lib/tour-design/tour-design-gate';
import {
  ensureTourDesignLead,
  patchOutlineApproved,
  patchOutlineResent,
  patchOutlineRevise,
  patchOutlineSent,
} from '@/lib/tour-design/tour-design-lead';
import {
  getOutlineAwaitingApproval,
  getPendingTourDesignLeads,
  getTourDraftForLead,
} from '@/lib/tour-design/tour-design-leads';
import { DEFAULT_TOUR_BRIEF, type TourBrief, type GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import {
  briefFromDraft,
  buildTourDraft,
  createOutlineDay,
  resolveExperienceOverrides,
  tourDraftIdForLead,
} from '@/lib/tour-design/tour-draft-utils';
import { outlineDocFromRows, printOutline } from '@/lib/outline/outline-html';
import { getCustomerName } from '@/lib/core/crm-utils';
import type { ExperienceOverride, OutlineStatus, Product, TourOutlineDay } from '@/lib/types';
import { paxToTierN, sumSellForProducts } from '@/lib/tour-design/tour-pricing';
import { toast } from '@/lib/toast';

const STEPS = ['Client Brief', 'Outline', 'Tour Experiences', 'Pricing', 'AI Export'] as const;

export default function TourDesign() {
  const searchParams = useSearchParams();
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const tourDrafts = useStore((s) => s.tourDrafts);
  const tourOutlineDays = useStore((s) => s.tourOutlineDays);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const hotels = useStore((s) => s.hotels);
  const addLead = useStore((s) => s.addLead);
  const updateLead = useStore((s) => s.updateLead);
  const addComm = useStore((s) => s.addComm);
  const upsertTourDraft = useStore((s) => s.upsertTourDraft);
  const replaceOutlineDaysForDraft = useStore((s) => s.replaceOutlineDaysForDraft);
  const { saveFromForm } = useRegisterCustomer();

  const [step, setStep] = useState(0);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [custId, setCustId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [aiPanel, setAiPanel] = useState<string | null>(null);
  const [markupPct, setMarkupPct] = useState(30);
  const [brief, setBrief] = useState<TourBrief>({ ...DEFAULT_TOUR_BRIEF });
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [experienceOverrides, setExperienceOverrides] = useState<Record<string, ExperienceOverride>>({});
  const [outlineStatus, setOutlineStatus] = useState<OutlineStatus>('draft');
  const [outlineNotes, setOutlineNotes] = useState('');
  const [outlineSentAt, setOutlineSentAt] = useState<string | undefined>();
  const [outlineApprovedAt, setOutlineApprovedAt] = useState<string | undefined>();
  const [outlineRevision, setOutlineRevision] = useState(0);
  const [outlineRows, setOutlineRows] = useState<TourOutlineDay[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const urlInitRef = useRef<string | null>(null);

  const experiencesBlocked = isExperiencesBlocked(leadId, outlineRows.length, outlineStatus);
  const pendingLeads = useMemo(() => getPendingTourDesignLeads(leads), [leads]);
  const awaitingOutline = useMemo(
    () => getOutlineAwaitingApproval(leads, tourDrafts),
    [leads, tourDrafts]
  );
  const draftId = leadId ? tourDraftIdForLead(leadId) : 'TD-local';

  const selectedProducts = useMemo(
    () => selectedCodes.map((c) => products.find((p) => p.code === c)).filter(Boolean) as Product[],
    [products, selectedCodes]
  );

  const custName = customers.find((c) => c.id === custId)?.name;

  const syncUrl = useCallback((lid: string, cid: string, s: number) => {
    if (typeof window === 'undefined') return;
    const url = `/tourdesign?leadId=${encodeURIComponent(lid)}&custId=${encodeURIComponent(cid)}&step=${s}`;
    window.history.replaceState(null, '', url);
  }, []);

  const persistDraft = useCallback(
    (
      patch?: {
        step?: number;
        outlineStatus?: OutlineStatus;
        outlineNotes?: string;
        outlineSentAt?: string;
        outlineApprovedAt?: string;
        outlineRevision?: number;
        outlineRows?: TourOutlineDay[];
        brief?: TourBrief;
        selectedCodes?: string[];
        selectedPackageId?: string | null;
        experienceOverrides?: Record<string, ExperienceOverride>;
        markupPct?: number;
        clientType?: 'b2c' | 'b2b';
      },
      overrideLeadId?: string
    ) => {
      const lid = overrideLeadId ?? leadId;
      if (!lid || !custId) return;
      const rows = patch?.outlineRows ?? outlineRows;
      const draft = buildTourDraft({
        leadId: lid,
        custId,
        brief: patch?.brief ?? brief,
        outlineStatus: patch?.outlineStatus ?? outlineStatus,
        outlineNotes: patch?.outlineNotes ?? outlineNotes,
        outlineSentAt: patch?.outlineSentAt ?? outlineSentAt,
        outlineApprovedAt: patch?.outlineApprovedAt ?? outlineApprovedAt,
        outlineRevision: patch?.outlineRevision ?? outlineRevision,
        selectedCodes: patch?.selectedCodes ?? selectedCodes,
        selectedPackageId: patch?.selectedPackageId ?? selectedPackageId,
        experienceOverrides: patch?.experienceOverrides ?? experienceOverrides,
        markupPct: patch?.markupPct ?? markupPct,
        clientType: patch?.clientType ?? clientType,
        currentStep: patch?.step ?? step,
      });
      upsertTourDraft(draft);
      replaceOutlineDaysForDraft(draft.id, rows);
    },
    [
      leadId,
      custId,
      brief,
      outlineStatus,
      outlineNotes,
      outlineSentAt,
      outlineApprovedAt,
      outlineRevision,
      outlineRows,
      selectedCodes,
      selectedPackageId,
      experienceOverrides,
      markupPct,
      clientType,
      step,
      upsertTourDraft,
      replaceOutlineDaysForDraft,
    ]
  );

  const openLeadSession = useCallback(
    (lid: string, cid: string, urlStep?: number) => {
      updateLead(lid, { tourDesignAcked: true });
      setLeadId(lid);
      setCustId(cid);

      const draft = tourDrafts.find((d) => d.leadId === lid);
      const c = customers.find((x) => x.id === cid);

      if (draft) {
        const savedBrief = briefFromDraft(draft);
        if (savedBrief) {
          setBrief({ ...DEFAULT_TOUR_BRIEF, ...savedBrief });
        } else if (c) {
          setBrief(customerToBrief(c));
        }
        setOutlineStatus(draft.outlineStatus ?? 'draft');
        setOutlineNotes(draft.outlineNotes ?? '');
        setOutlineSentAt(draft.outlineSentAt);
        setOutlineApprovedAt(draft.outlineApprovedAt);
        setOutlineRevision(draft.outlineRevision ?? 0);
        setSelectedCodes(draft.selectedCodes ?? []);
        setSelectedPackageId(draft.selectedPackageId ?? null);
        setExperienceOverrides(resolveExperienceOverrides(draft));
        setMarkupPct(draft.markupPct ?? 30);
        setClientType(draft.clientType ?? c?.clientType ?? 'b2c');
        const nextStep = urlStep ?? draft.currentStep ?? 0;
        setStep(nextStep);
        const days = tourOutlineDays.filter((d) => d.draftId === draft.id);
        setOutlineRows(days.length ? days : []);
      } else if (c) {
        setBrief(customerToBrief(c));
        setClientType(c.clientType || 'b2c');
        setOutlineRows([]);
        setOutlineStatus('draft');
        setOutlineNotes('');
        setOutlineSentAt(undefined);
        setOutlineApprovedAt(undefined);
        setOutlineRevision(0);
        setStep(urlStep ?? 0);
        setExperienceOverrides({});
      }
    },
    [customers, tourDrafts, tourOutlineDays, updateLead]
  );

  const ensureLeadSession = useCallback((): string => {
    if (leadId) return leadId;
    if (!custId) return '';
    const customer = customers.find((c) => c.id === custId);
    if (!customer) return '';
    const lead = ensureTourDesignLead({ custId, customer, brief, clientType, leads });
    if (!leads.some((l) => l.id === lead.id)) {
      addLead(lead);
    }
    setLeadId(lead.id);
    return lead.id;
  }, [leadId, custId, customers, brief, clientType, leads, addLead]);

  useEffect(() => {
    const urlLeadId = searchParams.get('leadId');
    const urlCustId = searchParams.get('custId');
    const urlStepRaw = searchParams.get('step');
    const urlStep = urlStepRaw != null ? parseInt(urlStepRaw, 10) : undefined;
    if (!urlLeadId || !urlCustId) return;
    const key = `${urlLeadId}:${urlCustId}:${urlStepRaw ?? ''}`;
    if (urlInitRef.current === key) return;
    urlInitRef.current = key;
    openLeadSession(urlLeadId, urlCustId, Number.isFinite(urlStep) ? urlStep : undefined);
  }, [searchParams, openLeadSession]);

  useEffect(() => {
    if (!leadId || !custId) return;
    const timer = setTimeout(() => {
      setSaveState('saving');
      persistDraft();
      setTimeout(() => setSaveState('saved'), 0);
    }, 800);
    return () => clearTimeout(timer);
  }, [
    leadId,
    custId,
    outlineRows,
    brief,
    outlineStatus,
    outlineNotes,
    outlineSentAt,
    outlineApprovedAt,
    outlineRevision,
    selectedCodes,
    selectedPackageId,
    experienceOverrides,
    markupPct,
    clientType,
    step,
    persistDraft,
  ]);

  const toggleProduct = (code: string) => {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        setExperienceOverrides((ov) => {
          if (!(code in ov)) return ov;
          const next = { ...ov };
          delete next[code];
          return next;
        });
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
    setSelectedPackageId(null);
  };

  const reorderCodes = (codes: string[]) => {
    setSelectedCodes(codes);
    setSelectedPackageId(null);
  };

  const patchOverride = (code: string, patch: OverridePatch) => {
    setExperienceOverrides((prev) => {
      const merged: ExperienceOverride = { ...prev[code] };
      if ('desc' in patch) {
        if (patch.desc?.trim()) merged.desc = patch.desc;
        else delete merged.desc;
      }
      if ('date' in patch) {
        if (patch.date?.trim()) merged.date = patch.date.trim();
        else delete merged.date;
      }
      if ('clientNote' in patch) {
        if (patch.clientNote?.trim()) merged.clientNote = patch.clientNote;
        else delete merged.clientNote;
      }
      if ('dayIndex' in patch) {
        if (typeof patch.dayIndex === 'number' && Number.isFinite(patch.dayIndex) && patch.dayIndex >= 1) {
          merged.dayIndex = Math.floor(patch.dayIndex);
        } else {
          delete merged.dayIndex;
        }
      }
      if ('durOverride' in patch) {
        if (patch.durOverride === 'full' || patch.durOverride === 'half') {
          merged.durOverride = patch.durOverride;
        } else {
          delete merged.durOverride;
        }
      }
      if (!merged.desc && !merged.date && !merged.clientNote && merged.dayIndex == null && !merged.durOverride) {
        if (!(code in prev)) return prev;
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return { ...prev, [code]: merged };
    });
  };

  function applyPackage(pkg: TourPackage) {
    setSelectedPackageId(pkg.id);
    setBrief((b) => ({
      ...b,
      duration: pkg.format,
      mustSee: pkg.route,
      region: pkg.tag === 'full' ? 'multi' : pkg.tag,
      notes: pkg.tagline,
    }));
  }

  function autoFillFromCustomer(id: string) {
    if (!id) {
      setCustId('');
      return;
    }
    setCustId(id);
    const c = customers.find((x) => x.id === id);
    if (!c) return;
    setBrief((b) => customerToBrief(c, b));
    setClientType(c.clientType || 'b2c');
  }

  function goToStep(next: number) {
    if (next === 1) {
      if (!custId) {
        toast.warning('Please select a customer before building the outline.');
        return;
      }
      const lid = ensureLeadSession();
      if (!lid) return;
      setStep(next);
      syncUrl(lid, custId, next);
      persistDraft({ step: next }, lid);
      return;
    }
    setStep(next);
    if (leadId && custId) {
      persistDraft({ step: next });
      syncUrl(leadId, custId, next);
    }
  }

  function currentDraftSnapshot() {
    return (
      getTourDraftForLead(leadId, tourDrafts) ??
      buildTourDraft({
        leadId,
        custId,
        brief,
        outlineStatus,
        outlineNotes,
        outlineSentAt,
        outlineApprovedAt,
        outlineRevision,
        selectedCodes,
        selectedPackageId,
        experienceOverrides,
        markupPct,
        clientType,
        currentStep: step,
      })
    );
  }

  function applyOutlineWorkflow(
    patch: ReturnType<typeof patchOutlineSent>,
    state: {
      outlineStatus?: OutlineStatus;
      outlineSentAt?: string;
      outlineApprovedAt?: string;
      outlineRevision?: number;
    }
  ) {
    if (!leadId || !custId) return;
    if (state.outlineStatus) setOutlineStatus(state.outlineStatus);
    if (state.outlineSentAt !== undefined) setOutlineSentAt(state.outlineSentAt);
    if (state.outlineApprovedAt !== undefined) setOutlineApprovedAt(state.outlineApprovedAt);
    if (state.outlineRevision !== undefined) setOutlineRevision(state.outlineRevision);
    updateLead(leadId, patch.lead);
    if (patch.comm) addComm(patch.comm);
    persistDraft({
      outlineStatus: state.outlineStatus,
      outlineSentAt: state.outlineSentAt,
      outlineApprovedAt: state.outlineApprovedAt,
      outlineRevision: state.outlineRevision,
      step,
      outlineRows,
    });
  }

  function aiSuggestStyle() {
    const interests = brief.interestsText || brief.interests.join(', ') || 'cultural highlights';
    setAiPanel(
      `Based on ${brief.clientName || 'this client'}'s profile (${brief.style}, ${brief.pax} guests, ${brief.budgetRange}), we recommend:\n\n• ${brief.region === 'north' ? 'Hanoi + Halong + Sapa' : brief.region === 'central' ? 'Hue + Hoi An + Da Nang' : 'Saigon + Mekong + Phu Quoc'} core route\n• ${brief.hotelTier} hotels · ${brief.language} guide\n• Pace: ${brief.pace} — ${interests}`
    );
  }

  function saveAsLead() {
    const cust = custId || customers.find((c) => c.name === brief.clientName)?.id || '';
    if (!cust) {
      toast.warning('Please select a customer before saving to the Sales Pipeline.');
      return;
    }

    const tierN = paxToTierN(brief.pax);
    let sellTotal = sumSellForProducts(selectedCodes, tierN, markupPct) * brief.pax;
    if (!sellTotal && selectedPackageId) {
      sellTotal = getPackageSellPerPax(selectedPackageId, brief.pax, brief.travelMonth) * brief.pax;
    }
    const customer = customers.find((c) => c.id === cust);
    const pkgName = selectedPackageId ? TOUR_PACKAGES.find((p) => p.id === selectedPackageId)?.name : null;
    const leadData = {
      tour:
        pkgName ||
        `${brief.duration} ${REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region} — ${selectedProducts.length} modules`,
      pax: brief.pax,
      value: sellTotal || 0,
      month: formatLeadTravelMonth(brief.travelMonth, brief.startDate),
      stage: 'Designing' as const,
      owner: brief.salesperson || 'Tai Pham',
      probability: 25,
      clientType,
      needsTourDesign: false,
      agentId: customer?.agentId,
    };

    if (leadId) {
      updateLead(leadId, leadData);
    } else {
      const id = nextLeadId(leads);
      addLead({
        id,
        custId: cust,
        ...leadData,
      });
    }

    persistDraft({ step });
    toast.success(`✓ Saved to Sales Pipeline!\n\nClient: ${brief.clientName || custName || 'New'}\nEst. Value: $${fmt(sellTotal)}`);
  }

  function resetDesign() {
    setBrief({ ...DEFAULT_TOUR_BRIEF });
    setSelectedCodes([]);
    setSelectedPackageId(null);
    setExperienceOverrides({});
    setCustId('');
    setLeadId('');
    setClientType('b2c');
    setMarkupPct(30);
    setAiPanel(null);
    setOutlineStatus('draft');
    setOutlineNotes('');
    setOutlineSentAt(undefined);
    setOutlineApprovedAt(undefined);
    setOutlineRevision(0);
    setOutlineRows([]);
    setSaveState('idle');
    setStep(0);
    urlInitRef.current = null;
  }

  function updateOutlineRow(id: string, patch: Partial<TourOutlineDay>) {
    setOutlineRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addOutlineDay() {
    setOutlineRows((rows) => [...rows, createOutlineDay(draftId, rows, brief.startDate)]);
  }

  function removeOutlineDay(id: string) {
    setOutlineRows((rows) => {
      const filtered = rows.filter((r) => r.id !== id);
      return filtered.map((r, i) => ({ ...r, dayNumber: i + 1, sortOrder: i + 1 }));
    });
  }

  function printOutlinePdf() {
    const clientName = brief.clientName || custName;
    printOutline(outlineDocFromRows(outlineRows, clientName));
  }

  function markOutlineSent() {
    if (!leadId || !custId) return;
    const name = custName || brief.clientName || 'Client';
    const patch = patchOutlineSent(currentDraftSnapshot(), custId, name, brief.salesperson);
    applyOutlineWorkflow(patch, {
      outlineStatus: 'sent',
      outlineSentAt: patch.draft.outlineSentAt,
      outlineRevision: patch.draft.outlineRevision,
    });
  }

  function resendOutline() {
    if (!leadId || !custId) return;
    const name = custName || brief.clientName || 'Client';
    const patch = patchOutlineResent(currentDraftSnapshot(), custId, name, brief.salesperson);
    applyOutlineWorkflow(patch, {
      outlineStatus: 'sent',
      outlineSentAt: patch.draft.outlineSentAt,
      outlineRevision: patch.draft.outlineRevision,
    });
  }

  function approveOutline() {
    if (!leadId || !custId) return;
    const name = custName || brief.clientName || 'Client';
    const patch = patchOutlineApproved(currentDraftSnapshot(), custId, name, brief.salesperson);
    applyOutlineWorkflow(patch, {
      outlineStatus: 'approved',
      outlineApprovedAt: patch.draft.outlineApprovedAt,
    });
  }

  function reviseOutline() {
    if (!leadId || !custId) return;
    const patch = patchOutlineRevise(currentDraftSnapshot());
    setOutlineStatus('draft');
    setOutlineApprovedAt(undefined);
    updateLead(leadId, patch.lead);
    persistDraft({ outlineStatus: 'draft', outlineApprovedAt: undefined, step, outlineRows });
  }

  function handleStepClick(i: number) {
    if (i === 2 && experiencesBlocked) return;
    goToStep(i);
  }

  return (
    <div>
      {pendingLeads.length > 0 && !leadId && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-hd">
            <span className="card-title">New clients from Sales Pipeline</span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {pendingLeads.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--b)',
                }}
              >
                <div style={{ fontSize: 13 }}>
                  <strong>{getCustomerName(customers, l.custId)}</strong>
                  <span style={{ color: 'var(--m)', marginLeft: 8 }}>{l.month}</span>
                </div>
                <Link
                  href={`/tourdesign?leadId=${encodeURIComponent(l.id)}&custId=${encodeURIComponent(l.custId)}&step=0`}
                  className="btn btn-p btn-sm"
                >
                  Continue →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {awaitingOutline.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: 'var(--amb)' }}>
          <div className="card-hd">
            <span className="card-title">Awaiting outline approval</span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            {awaitingOutline.map((l) => {
              const draft = getTourDraftForLead(l.id, tourDrafts);
              return (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--b)',
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <strong>{getCustomerName(customers, l.custId)}</strong>
                    <span style={{ color: 'var(--m)', marginLeft: 8 }}>
                      Outline v{draft?.outlineRevision ?? 1} sent — waiting for client
                    </span>
                  </div>
                  <Link
                    href={`/tourdesign?leadId=${encodeURIComponent(l.id)}&custId=${encodeURIComponent(l.custId)}&step=1`}
                    className="btn btn-s btn-sm"
                  >
                    Open outline →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="td-steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`td-step${step === i ? ' on' : ''}${step > i ? ' done' : ''}${i === 2 && experiencesBlocked ? ' td-step-locked' : ''}`}
            onClick={() => handleStepClick(i)}
            role="button"
            tabIndex={0}
          >
            <span className="td-step-num">{i + 1}</span>
            <span className="td-step-label">{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <ClientBriefStep
          brief={brief}
          setBrief={setBrief}
          clientType={clientType}
          setClientType={setClientType}
          custId={custId}
          customers={customers}
          onSelectCustomer={autoFillFromCustomer}
          onNewCustomer={() => setClientFormOpen(true)}
          aiPanel={aiPanel}
          onAiSuggest={aiSuggestStyle}
          onCloseAi={() => setAiPanel(null)}
          onNext={() => goToStep(1)}
        />
      )}

      {step === 1 && (
        <OutlineStep
          outlineRows={outlineRows}
          outlineStatus={outlineStatus}
          outlineSentAt={outlineSentAt}
          outlineApprovedAt={outlineApprovedAt}
          outlineRevision={outlineRevision}
          outlineNotes={outlineNotes}
          onOutlineNotesChange={setOutlineNotes}
          saveState={saveState}
          experiencesBlocked={experiencesBlocked}
          clientName={brief.clientName || custName}
          onUpdateRow={updateOutlineRow}
          onAddDay={addOutlineDay}
          onRemoveDay={removeOutlineDay}
          onPrint={printOutlinePdf}
          onMarkSent={markOutlineSent}
          onApprove={approveOutline}
          onRevise={reviseOutline}
          onResend={resendOutline}
          onBack={() => goToStep(0)}
          onNext={() => goToStep(2)}
        />
      )}

      {step === 2 && (
        <div>
          <TourExperiencesStep
            products={products}
            photos={photos}
            brief={brief}
            clientType={clientType}
            custName={custName}
            selectedCodes={selectedCodes}
            onToggleProduct={toggleProduct}
            onReorderCodes={reorderCodes}
            experienceOverrides={experienceOverrides}
            onPatchOverride={patchOverride}
            onSelectPackage={applyPackage}
            selectedPackageId={selectedPackageId}
            outlineRows={outlineRows}
            markupPct={markupPct}
            leadId={leadId || undefined}
            onEditBrief={() => goToStep(0)}
          />
          <div className="td-nav" style={{ marginTop: 14 }}>
            <button className="btn btn-s" type="button" onClick={() => goToStep(1)}>
              ← Back
            </button>
            <button
              className="btn btn-p"
              type="button"
              onClick={() => {
                persistDraft({ step: 3, selectedCodes, selectedPackageId });
                goToStep(3);
              }}
              disabled={selectedCodes.length === 0 && !selectedPackageId}
            >
              Next: Pricing →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <PricingStep
          briefPax={brief.pax}
          selectedProducts={selectedProducts}
          markupPct={markupPct}
          onMarkupChange={(pct) => {
            setMarkupPct(pct);
            persistDraft({ markupPct: pct, step: 3 });
          }}
          onBack={() => goToStep(2)}
          onNext={() => goToStep(4)}
        />
      )}

      {step === 4 && (
        <ProposalExportStep
          brief={brief}
          clientType={clientType}
          customerName={custName || brief.clientName}
          selectedProducts={selectedProducts}
          selectedCodes={selectedCodes}
          selectedPackageId={selectedPackageId}
          experienceOverrides={experienceOverrides}
          outlineRows={outlineRows}
          markupPct={markupPct}
          leadId={leadId || undefined}
          galleryPhotos={photos}
          hotelsCatalog={hotels}
          onSavePipeline={saveAsLead}
          onReset={resetDesign}
          onBack={() => goToStep(3)}
        />
      )}

      <CustomerFormModal
        open={clientFormOpen}
        mode="add"
        customers={customers}
        onClose={() => setClientFormOpen(false)}
        onSave={(payload) => {
          const result = saveFromForm(payload);
          if (!result.ok) return false;
          setClientFormOpen(false);
          autoFillFromCustomer(result.customer.id);
          if (result.message) toast.success(result.message);
          return true;
        }}
      />
    </div>
  );
}
