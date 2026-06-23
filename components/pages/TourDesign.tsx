'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { REG_LABELS } from '@/lib/page-helpers';
import { useStore } from '@/hooks/useStore';
import { useRegisterCustomer } from '@/hooks/useRegisterCustomer';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import ClientBriefStep from '@/components/tourdesign/ClientBriefStep';
import TourExperiencesStep from '@/components/tourdesign/TourExperiencesStep';
import PricingStep from '@/components/tourdesign/PricingStep';
import AiExportStep from '@/components/tourdesign/AiExportStep';
import { TOUR_PACKAGES, type TourPackage } from '@/lib/seeds/tourPackages';
import { DEFAULT_TOUR_BRIEF, type TourBrief, type GalleryPhoto } from '@/lib/tour-design-types';
import type { Product } from '@/lib/types';
import { paxToTierN, sumSellForProducts } from '@/lib/tour-pricing';

const STEPS = ['Client Brief', 'Tour Experiences', 'Pricing', 'AI Export'] as const;

export default function TourDesign() {
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const addLead = useStore((s) => s.addLead);
  const { saveFromForm } = useRegisterCustomer();

  const [step, setStep] = useState(0);
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientType, setClientType] = useState<'b2c' | 'b2b'>('b2c');
  const [custId, setCustId] = useState('');
  const [aiPanel, setAiPanel] = useState<string | null>(null);
  const [markupPct, setMarkupPct] = useState(30);
  const [brief, setBrief] = useState<TourBrief>({ ...DEFAULT_TOUR_BRIEF });
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const selectedProducts = useMemo(
    () => selectedCodes.map((c) => products.find((p) => p.code === c)).filter(Boolean) as Product[],
    [products, selectedCodes]
  );

  const custName = customers.find((c) => c.id === custId)?.name;

  const toggleProduct = (code: string) => {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    setSelectedPackageId(null);
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
    setBrief((b) => ({
      ...b,
      clientName: c.name,
      clientEmail: c.email,
      style: c.style || b.style,
      language: c.lang || b.language,
      agentRef: c.agentName || b.agentRef,
      nationality: c.nat || b.nationality,
      travelMonth: c.travelMonth || b.travelMonth,
      hotelTier: c.hotelTier || b.hotelTier,
      budgetRange: c.budget || b.budgetRange,
      salesperson: c.salesperson || b.salesperson,
    }));
    setClientType(c.clientType || 'b2c');
  }

  function aiSuggestStyle() {
    const interests = brief.interestsText || brief.interests.join(', ') || 'cultural highlights';
    setAiPanel(
      `Based on ${brief.clientName || 'this client'}'s profile (${brief.style}, ${brief.pax} guests, ${brief.budgetRange}), we recommend:\n\n• ${brief.region === 'north' ? 'Hanoi + Halong + Sapa' : brief.region === 'central' ? 'Hue + Hoi An + Da Nang' : 'Saigon + Mekong + Phu Quoc'} core route\n• ${brief.hotelTier} hotels · ${brief.language} guide\n• Pace: ${brief.pace} — ${interests}`
    );
  }

  function saveAsLead() {
    const tierN = paxToTierN(brief.pax);
    const sellTotal = sumSellForProducts(selectedCodes, tierN, markupPct) * brief.pax;
    const id = `LD-${String(Date.now()).slice(-6)}`;
    const cust = custId || customers.find((c) => c.name === brief.clientName)?.id || '';
    const pkgName = selectedPackageId ? TOUR_PACKAGES.find((p) => p.id === selectedPackageId)?.name : null;
    addLead({
      id,
      custId: cust || 'CU-NEW',
      tour: pkgName || `${brief.duration} ${REG_LABELS[brief.region as keyof typeof REG_LABELS] || brief.region} — ${selectedProducts.length} modules`,
      pax: brief.pax,
      value: sellTotal || 0,
      month: brief.travelMonth || brief.startDate?.slice(0, 7) || 'TBD',
      stage: 'Designing',
      owner: brief.salesperson || 'Tai Pham',
      probability: 25,
      clientType,
    });
    alert(`✓ Saved to Sales Pipeline!\n\nLead: ${id}\nClient: ${brief.clientName || custName || 'New'}\nEst. Value: $${fmt(sellTotal)}`);
  }

  function resetDesign() {
    setBrief({ ...DEFAULT_TOUR_BRIEF });
    setSelectedCodes([]);
    setSelectedPackageId(null);
    setCustId('');
    setClientType('b2c');
    setMarkupPct(30);
    setAiPanel(null);
    setStep(0);
  }

  return (
    <div>
      <div className="td-steps">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`td-step${step === i ? ' on' : ''}${step > i ? ' done' : ''}`}
            onClick={() => setStep(i)}
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
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <div>
          <TourExperiencesStep
            products={products}
            photos={photos}
            brief={brief}
            clientType={clientType}
            custName={custName}
            selectedCodes={selectedCodes}
            onToggleProduct={toggleProduct}
            onSelectPackage={applyPackage}
            selectedPackageId={selectedPackageId}
            onEditBrief={() => setStep(0)}
          />
          <div className="td-nav" style={{ marginTop: 14 }}>
            <button className="btn btn-s" type="button" onClick={() => setStep(0)}>
              ← Back
            </button>
            <button
              className="btn btn-p"
              type="button"
              onClick={() => setStep(2)}
              disabled={selectedCodes.length === 0 && !selectedPackageId}
            >
              Next: Pricing →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <PricingStep
          briefPax={brief.pax}
          selectedProducts={selectedProducts}
          markupPct={markupPct}
          onMarkupChange={setMarkupPct}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <AiExportStep
          brief={brief}
          clientType={clientType}
          selectedProducts={selectedProducts}
          markupPct={markupPct}
          onSavePipeline={saveAsLead}
          onReset={resetDesign}
          onBack={() => setStep(2)}
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
          if (result.message) alert(result.message);
          return true;
        }}
      />
    </div>
  );
}
