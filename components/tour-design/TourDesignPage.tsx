'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import ClientBriefStep from '@/components/tour-design/ClientBriefStep';
import OutlineStep from '@/components/tour-design/OutlineStep';
import TourExperiencesStep from '@/components/tour-design/TourExperiencesStep';
import PricingStep from '@/components/tour-design/PricingStep';
import ProposalExportStep from '@/components/tour-design/ProposalExportStep';
import type { OverridePatch } from '@/components/tour-design/SelectedExperiencesPanel';
import type { TourPackage } from '@/lib/seeds/tourPackages';
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
  isPendingTourDesignLead,
} from '@/lib/tour-design/tour-design-leads';
import { DEFAULT_TOUR_BRIEF, type TourBrief, type GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import {
  briefFromDraft,
  buildTourDraft,
  createOutlineDay,
  resolveExperienceOverrides,
  resolveProposalExportState,
  type ProposalHotelRatesPersist,
  tourDraftIdForLead,
} from '@/lib/tour-design/tour-draft-utils';
import { TourDraftSaveQueue } from '@/lib/tour-design/tour-save-queue';
import { outlineDocFromRows, printOutline } from '@/lib/outline/outline-html';
import { getBffArray, getBffData } from '@/lib/bff/client';
import type { ProposalTemplateOverrides } from '@/lib/proposals/proposal-content-overrides';
import { DEFAULT_PROPOSAL_LAYOUT_ID, type ProposalLayoutId } from '@/lib/proposals/proposal-layouts';
import type { ExperienceOverride, OutlineStatus, Product, ProductPricing, TourDraft, TourOutlineDay } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useTourDesignCrmContext } from '@/hooks/useTourDesignCrmContext';
import { TourDesignQueueCards } from '@/components/tour-design/TourDesignQueueCards';

const STEPS = ['Client Brief', 'Outline', 'Tour Experiences', 'Pricing', 'Export'] as const;

export default function TourDesignPage() {
  const { canWrite } = usePagePermission('tourdesign');
  useTourDesignCrmContext();
  const searchParams = useSearchParams();
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const tourDrafts = useStore((s) => s.tourDrafts);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const hotels = useStore((s) => s.hotels);
  const addLead = useStore((s) => s.addLead);
  const updateLead = useStore((s) => s.updateLead);
  const addComm = useStore((s) => s.addComm);
  const upsertTourDraft = useStore((s) => s.upsertTourDraft);
  const replaceOutlineDaysForDraft = useStore((s) => s.replaceOutlineDaysForDraft);
  const setProducts = useStore((s) => s.setProducts);
  const setProductPricing = useStore((s) => s.setProductPricing);
  const setTourDrafts = useStore((s) => s.setTourDrafts);
  const setPhotos = useStore((s) => s.setPhotos);
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
  const [proposalTemplateOverrides, setProposalTemplateOverrides] = useState<ProposalTemplateOverrides>({});
  const [proposalSpecialNotes, setProposalSpecialNotes] = useState('');
  const [proposalHotelRates, setProposalHotelRates] = useState<ProposalHotelRatesPersist | null>(null);
  const [proposalLayoutId, setProposalLayoutId] = useState<ProposalLayoutId>(DEFAULT_PROPOSAL_LAYOUT_ID);
  const [outlineStatus, setOutlineStatus] = useState<OutlineStatus>('draft');
  const [outlineNotes, setOutlineNotes] = useState('');
  const [outlineSentAt, setOutlineSentAt] = useState<string | undefined>();
  const [outlineApprovedAt, setOutlineApprovedAt] = useState<string | undefined>();
  const [outlineRevision, setOutlineRevision] = useState(0);
  const [outlineRows, setOutlineRows] = useState<TourOutlineDay[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [readError, setReadError] = useState<string | null>(null);

  const urlInitRef = useRef<string | null>(null);
  const lastDraftFingerprintsRef = useRef(new Map<string, string>());
  const saveQueueRef = useRef(new TourDraftSaveQueue());

  useEffect(() => {
    let active = true;
    void getBffArray<GalleryPhoto>('/api/photos/all', 'Không thể tải thư viện ảnh.').then((galleryPhotos) => {
      if (!active) return;
      setPhotos(galleryPhotos);
      setReadError(null);
    }).catch((error: unknown) => {
      if (active) setReadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu Tour Design.');
    });
    return () => {
      active = false;
    };
  }, [setPhotos]);

  useEffect(() => {
    const leadIds = [...new Set(leads.map((lead) => lead.id).filter(Boolean))];
    if (leadIds.length === 0) {
      setTourDrafts([]);
      return;
    }

    let active = true;
    void getBffArray<TourDraft>(
      `/api/tour-design/drafts?leadIds=${encodeURIComponent(leadIds.join(','))}`,
      'Không thể tải bản nháp tour.'
    ).then((drafts) => {
      if (!active) return;
      drafts.forEach((draft) => {
        saveQueueRef.current.setSaveRevision(draft.id, draft.saveRevision ?? 0);
      });
      setTourDrafts(drafts);
    }).catch((error: unknown) => {
      if (active) setReadError(error instanceof Error ? error.message : 'Không thể tải bản nháp tour.');
    });

    return () => {
      active = false;
    };
  }, [leads, setTourDrafts]);

  useEffect(() => {
    const missingCodes = selectedCodes.filter((code) => !products.some((product) => product.code === code));
    if (missingCodes.length === 0) return;

    let active = true;
    void Promise.all(missingCodes.map(async (code) => {
      const [product, pricing] = await Promise.all([
        getBffData<Product>(`/api/products?code=${encodeURIComponent(code)}`, 'Không thể tải Product đã chọn.'),
        getBffData<ProductPricing>(`/api/products/pricing?productCode=${encodeURIComponent(code)}`, 'Không thể tải bảng giá Product đã chọn.'),
      ]);
      return { product, pricing };
    })).then((loaded) => {
      if (!active) return;
      const currentProducts = useStore.getState().products;
      const byCode = new Map(currentProducts.map((product) => [product.code, product]));
      loaded.forEach(({ product }) => byCode.set(product.code, product));
      setProducts([...byCode.values()]);
      const currentPricing = useStore.getState().productPricing;
      const pricingByCode = new Map(currentPricing.map((pricing) => [pricing.productCode, pricing]));
      loaded.forEach(({ pricing }) => pricingByCode.set(pricing.productCode, pricing));
      setProductPricing([...pricingByCode.values()]);
    }).catch((error: unknown) => {
      if (active) setReadError(error instanceof Error ? error.message : 'Không thể tải Product đã chọn.');
    });

    return () => {
      active = false;
    };
  }, [products, selectedCodes, setProductPricing, setProducts]);

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
    async (
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
        proposalTemplateOverrides?: ProposalTemplateOverrides;
        proposalSpecialNotes?: string;
        proposalHotelRates?: ProposalHotelRatesPersist | null;
        proposalLayoutId?: ProposalLayoutId;
        markupPct?: number;
        clientType?: 'b2c' | 'b2b';
      },
      overrideLeadId?: string
    ) => {
      if (!canWrite) return false;
      const lid = overrideLeadId ?? leadId;
      if (!lid || !custId) return false;
      const rows = patch?.outlineRows ?? outlineRows;
      const templateOverrides = patch?.proposalTemplateOverrides ?? proposalTemplateOverrides;
      const specialNotes = patch?.proposalSpecialNotes ?? proposalSpecialNotes;
      const hotelRates =
        patch?.proposalHotelRates !== undefined ? patch.proposalHotelRates : proposalHotelRates;
      const layoutId = patch?.proposalLayoutId ?? proposalLayoutId;
      const draft = buildTourDraft({
        leadId: lid,
        custId,
        brief: patch?.brief ?? brief,
        outlineStatus: patch?.outlineStatus ?? outlineStatus,
        outlineNotes: patch?.outlineNotes ?? outlineNotes,
        outlineSentAt: patch?.outlineSentAt ?? outlineSentAt,
        outlineApprovedAt: patch?.outlineApprovedAt ?? outlineApprovedAt,
        outlineRevision: patch?.outlineRevision ?? outlineRevision,
        saveRevision: saveQueueRef.current.getSaveRevision(tourDraftIdForLead(lid)),
        selectedCodes: patch?.selectedCodes ?? selectedCodes,
        selectedPackageId: patch?.selectedPackageId ?? selectedPackageId,
        experienceOverrides: patch?.experienceOverrides ?? experienceOverrides,
        proposalExport: {
          templateOverrides,
          specialNotes,
          hotelRates: hotelRates ?? undefined,
          layoutId,
        },
        markupPct: patch?.markupPct ?? markupPct,
        clientType: patch?.clientType ?? clientType,
        currentStep: patch?.step ?? step,
      });
      const draftForFingerprint = { ...draft };
      delete draftForFingerprint.saveRevision;
      const fingerprint = JSON.stringify({ draft: draftForFingerprint, rows });
      if (lastDraftFingerprintsRef.current.get(draft.id) === fingerprint) return true;
      try {
        await saveQueueRef.current.enqueue({
          draftId: draft.id,
          initialSaveRevision: draft.saveRevision ?? 0,
          save: async (expectedSaveRevision) => {
            const response = await fetch('/api/tour-design/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ draft, outlineDays: rows, expectedSaveRevision }),
            });
            const result = await response.json().catch(() => null) as {
              ok?: boolean;
              error?: string;
              data?: { saveRevision?: number };
              currentSaveRevision?: number;
            } | null;
            if (!response.ok || !result?.ok) {
              const error = new Error(result?.error ?? 'Không thể lưu thiết kế tour.') as Error & {
                currentSaveRevision?: number;
              };
              if (typeof result?.currentSaveRevision === 'number') {
                error.currentSaveRevision = result.currentSaveRevision;
                // Let an already queued newer save use the server's current version.
                saveQueueRef.current.setSaveRevision(draft.id, result.currentSaveRevision);
              }
              throw error;
            }
            const saveRevision = result.data?.saveRevision;
            if (typeof saveRevision !== 'number' || !Number.isInteger(saveRevision) || saveRevision < 1) {
              throw new Error('Máy chủ không trả về phiên bản lưu hợp lệ.');
            }
            return { saveRevision };
          },
          onLatestSuccess: ({ saveRevision }) => {
            lastDraftFingerprintsRef.current.set(draft.id, fingerprint);
            upsertTourDraft({ ...draft, saveRevision });
            replaceOutlineDaysForDraft(draft.id, rows);
          },
        });
        return true;
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'currentSaveRevision' in error &&
          typeof error.currentSaveRevision === 'number'
        ) {
          saveQueueRef.current.setSaveRevision(draft.id, error.currentSaveRevision);
        }
        console.error('Failed to save tour design:', error);
        return false;
      }
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
      proposalTemplateOverrides,
      proposalSpecialNotes,
      proposalHotelRates,
      proposalLayoutId,
      markupPct,
      clientType,
      step,
      upsertTourDraft,
      replaceOutlineDaysForDraft,
      canWrite,
    ]
  );

  const persistTourDesignAck = useCallback(
    async (lid: string) => {
      if (!canWrite) return;
      const lead = useStore.getState().leads.find((l) => l.id === lid);
      if (!lead || !isPendingTourDesignLead(lead) || lead.stage !== 'Pending') return;

      try {
        const response = await fetch('/api/tour-design/acknowledgements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lid }),
        });
        const body = await response.json() as {
          ok?: boolean;
          error?: string;
          data?: { lead?: typeof lead | null; acknowledged?: boolean };
        };
        if (!response.ok || !body.ok || typeof body.data?.acknowledged !== 'boolean') {
          throw new Error(body.error || 'Could not save the Tour Design task.');
        }
        if (body.data.lead?.id === lid) {
          updateLead(lid, body.data.lead);
        }
      } catch {
        toast.warning('Could not save the Tour Design task. It will stay in the queue.');
      }
    },
    [canWrite, updateLead]
  );

  const openLeadSession = useCallback(
    async (lid: string, cid: string, urlStep?: number) => {
      setLeadId(lid);
      setCustId(cid);

      let draft = tourDrafts.find((item) => item.leadId === lid) ?? null;
      let days: TourOutlineDay[] = [];
      const c = customers.find((x) => x.id === cid);

      try {
        const loadedDraft = await getBffData<TourDraft | null>(
          `/api/tour-design/drafts?id=${encodeURIComponent(tourDraftIdForLead(lid))}`,
          'Không thể tải bản nháp tour.'
        );
        if (loadedDraft) {
          draft = loadedDraft;
          days = await getBffArray<TourOutlineDay>(
            `/api/tour-design/outlines?draftId=${encodeURIComponent(loadedDraft.id)}`,
            'Không thể tải hành trình tour.'
          );
          upsertTourDraft(loadedDraft);
          replaceOutlineDaysForDraft(loadedDraft.id, days);
        }
      } catch (error) {
        setReadError(error instanceof Error ? error.message : 'Không thể tải bản nháp tour.');
        return;
      }

      if (draft) {
        saveQueueRef.current.setSaveRevision(draft.id, draft.saveRevision ?? 0);
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
        const proposalExport = resolveProposalExportState(draft);
        setProposalTemplateOverrides(proposalExport.templateOverrides ?? {});
        setProposalSpecialNotes(proposalExport.specialNotes ?? '');
        setProposalHotelRates(proposalExport.hotelRates ?? null);
        setProposalLayoutId(proposalExport.layoutId ?? DEFAULT_PROPOSAL_LAYOUT_ID);
        setMarkupPct(draft.markupPct ?? 30);
        setClientType(draft.clientType ?? c?.clientType ?? 'b2c');
        const nextStep = urlStep ?? draft.currentStep ?? 0;
        setStep(nextStep);
        setOutlineRows(days.length ? days : []);
      } else if (c) {
        saveQueueRef.current.setSaveRevision(tourDraftIdForLead(lid), 0);
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
        setProposalTemplateOverrides({});
        setProposalSpecialNotes('');
        setProposalHotelRates(null);
        setProposalLayoutId(DEFAULT_PROPOSAL_LAYOUT_ID);
        setSelectedCodes([]);
        setSelectedPackageId(null);
      }
    },
    [customers, replaceOutlineDaysForDraft, tourDrafts, upsertTourDraft]
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
    const restoredStep = Number.isFinite(urlStep) ? urlStep : undefined;
    void openLeadSession(urlLeadId, urlCustId, restoredStep);
    if ((restoredStep ?? 0) >= 1) {
      void persistTourDesignAck(urlLeadId);
    }
  }, [searchParams, openLeadSession, persistTourDesignAck]);

  useEffect(() => {
    if (!leadId || !custId) return;
    let active = true;
    const timer = setTimeout(() => {
      setSaveState('saving');
      void persistDraft().then((saved) => {
        if (active) setSaveState(saved ? 'saved' : 'error');
      });
    }, 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
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
    proposalTemplateOverrides,
    proposalSpecialNotes,
    proposalHotelRates,
    proposalLayoutId,
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

  async function goToStep(next: number) {
    if (next === 1) {
      if (!custId) {
        toast.warning('Please select a customer before building the outline.');
        return;
      }
      const lid = ensureLeadSession();
      if (!lid) return;
      const saved = await persistDraft({ step: next }, lid);
      if (!saved) {
        toast.warning('Could not save the client brief.');
        return;
      }
      setStep(next);
      syncUrl(lid, custId, next);
      void persistTourDesignAck(lid);
      return;
    }
    setStep(next);
    if (leadId && custId) {
      void persistDraft({ step: next });
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
        proposalExport: {
          templateOverrides: proposalTemplateOverrides,
          specialNotes: proposalSpecialNotes,
          hotelRates: proposalHotelRates ?? undefined,
          layoutId: proposalLayoutId,
        },
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

  function resetDesign() {
    setBrief({ ...DEFAULT_TOUR_BRIEF });
    setSelectedCodes([]);
    setSelectedPackageId(null);
    setExperienceOverrides({});
    setProposalTemplateOverrides({});
    setProposalSpecialNotes('');
    setProposalHotelRates(null);
    setProposalLayoutId(DEFAULT_PROPOSAL_LAYOUT_ID);
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
    lastDraftFingerprintsRef.current.clear();
    saveQueueRef.current.clear();
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
      {readError && <div className="crm-page-hydrate-error" role="alert">{readError}</div>}
      <TourDesignQueueCards
        pendingLeads={pendingLeads}
        awaitingOutline={awaitingOutline}
        leadId={leadId}
        customers={customers}
        tourDrafts={tourDrafts}
      />

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
          canWrite={canWrite}
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
          canWrite={canWrite}
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
            canWrite={canWrite}
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
              disabled={(selectedCodes.length === 0 && !selectedPackageId) || !canWrite}
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
          canWrite={canWrite}
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
          templateOverrides={proposalTemplateOverrides}
          specialNotes={proposalSpecialNotes}
          hotelRates={proposalHotelRates}
          layoutId={proposalLayoutId}
          onTemplateOverridesChange={setProposalTemplateOverrides}
          onSpecialNotesChange={setProposalSpecialNotes}
          onHotelRatesChange={setProposalHotelRates}
          onLayoutIdChange={(next) => {
            setProposalLayoutId(next);
            persistDraft({ proposalLayoutId: next, step: 4 });
          }}
          onReset={resetDesign}
          onBack={() => goToStep(3)}
          canWrite={canWrite}
        />
      )}

      <CustomerFormModal
        open={clientFormOpen}
        mode="add"
        customers={customers}
        onClose={() => setClientFormOpen(false)}
        onSave={async (payload) => {
          try {
            const result = await saveFromForm(payload);
            if (!result.ok) return result;
            setClientFormOpen(false);
            autoFillFromCustomer(result.customer.id);
            if (result.message) toast.success(result.message);
            return result;
          } catch (err) {
            return {
              ok: false as const,
              error: 'save_failed' as const,
              message: err instanceof Error ? err.message : 'Không thể tạo khách hàng.',
            };
          }
        }}
      />
    </div>
  );
}
