'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import ModulesView from '@/components/products/ModulesView';
import PortfolioImportModal from '@/components/products/PortfolioImportModal';
import ProductDetailDrawer from '@/components/products/ProductDetailDrawer';
import ProductEditPanel from '@/components/products/ProductEditPanel';
import ProductLibrary from '@/components/products/ProductLibrary';
import { ensureTablesLoaded, pushTablesToSupabase } from '@/lib/db/hydrate';
import { isRemoteDataEnabled, isSupabaseReadOnly } from '@/lib/env';
import { validateProductCodeInput } from '@/lib/products/product-code';
import type { PricingStatusFilter } from '@/lib/products/product-pricing-helpers';
import { useStore } from '@/hooks/useStore';
import type { Product } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';

type ViewTab = 'library' | 'modules';
type ShellMode = 'catalog' | 'modules' | 'manage';

export default function Products() {
  const { canWrite } = usePagePermission('products');
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [viewTab, setViewTab] = useState<ViewTab>('library');
  const [pickMode, setPickMode] = useState(false);
  const [returnTab, setReturnTab] = useState<ViewTab>('library');

  const [libSearch, setLibSearch] = useState('');
  const [modSearch, setModSearch] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [pricingStatus, setPricingStatus] = useState<PricingStatusFilter>('');
  const [shownCount, setShownCount] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const [detailProductCode, setDetailProductCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [draftPreview, setDraftPreview] = useState<Product | null>(null);
  const [productSaveBusy, setProductSaveBusy] = useState(false);
  const [catalogueLoading, setCatalogueLoading] = useState(false);

  const detailProduct = useMemo(
    () => (detailProductCode ? products.find((p) => p.code === detailProductCode) ?? null : null),
    [products, detailProductCode]
  );

  const shellMode: ShellMode = pickMode ? 'manage' : viewTab === 'modules' ? 'modules' : 'catalog';
  const searchValue = shellMode === 'modules' || (pickMode && returnTab === 'modules') ? modSearch : libSearch;
  const setSearchValue = shellMode === 'modules' || (pickMode && returnTab === 'modules') ? setModSearch : setLibSearch;

  const closeForm = useCallback(() => {
    if (productSaveBusy) return;
    setFormOpen(false);
    setEditProduct(null);
    setIsNew(false);
    setSaveError(null);
    setDraftPreview(null);
  }, [productSaveBusy]);

  const exitPickMode = () => {
    setPickMode(false);
    closeForm();
    setDetailProductCode(null);
  };

  const loadCatalogueForInteraction = useCallback(async () => {
    setCatalogueLoading(true);
    try {
      await ensureTablesLoaded(['products', 'product_pricing']);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tải catalogue product.');
      return false;
    } finally {
      setCatalogueLoading(false);
    }
  }, []);

  const setShellMode = (mode: ShellMode) => {
    if (formOpen) closeForm();
    if (mode === 'manage') {
      void (async () => {
        if (!(await loadCatalogueForInteraction())) return;
        setReturnTab(viewTab);
        setPickMode(true);
        setDetailProductCode(null);
      })();
      return;
    }
    setPickMode(false);
    setDetailProductCode(null);
    setViewTab(mode === 'modules' ? 'modules' : 'library');
  };

  const openFormForProduct = (p: Product) => {
    if (!pickMode) setReturnTab(viewTab);
    setDetailProductCode(p.code);
    setEditProduct(p);
    setIsNew(false);
    setSaveError(null);
    setDraftPreview(p);
    setFormOpen(true);
  };

  const openFormForNew = () => {
    if (!pickMode) setReturnTab(viewTab);
    setDetailProductCode(null);
    setEditProduct(null);
    setIsNew(true);
    setSaveError(null);
    setDraftPreview(null);
    setFormOpen(true);
  };

  const handleDraftChange = useCallback((draft: Product) => {
    setDraftPreview(draft);
  }, []);

  const handleSave = async (product: Product, asDraft: boolean) => {
    const codeInputError = validateProductCodeInput({
      region: product.region,
      dest: product.dest,
      dur: product.dur,
      cat: product.cat,
    });
    if (codeInputError) {
      setSaveError(codeInputError);
      throw new Error(codeInputError);
    }

    const status: Product['status'] = asDraft
      ? 'draft'
      : product.status === 'archived'
        ? 'archived'
        : 'active';
    const payload: Product = { ...product, status };
    if (isNew) {
      if (!payload.code.trim()) {
        const msg = 'Product code is missing. Check destination and code type in the form.';
        setSaveError(msg);
        throw new Error(msg);
      }
      if (products.some((p) => p.code === payload.code)) {
        const msg = `Product code "${payload.code}" already exists. Change destination or code type to generate a different code.`;
        setSaveError(msg);
        throw new Error(msg);
      }
    }

    setProductSaveBusy(true);
    try {
      if (isNew) {
        addProduct(payload);
      } else {
        updateProduct(payload.code, payload);
      }

      setSaveError(null);
      setIsNew(false);
      setEditProduct(payload);
      setDetailProductCode(payload.code);
      setDraftPreview(payload);

      if (isRemoteDataEnabled() && !isSupabaseReadOnly()) {
        const result = await pushTablesToSupabase(['products'], false);
        if (!result.ok) {
          const msg = result.error ?? 'Không lưu được product lên Supabase';
          setSaveError(msg);
          throw new Error(msg);
        }
      }
    } finally {
      setProductSaveBusy(false);
    }
  };

  const handleDelete = (code: string) => {
    deleteProduct(code);
    closeForm();
    if (pickMode) {
      setPickMode(false);
    }
    setDetailProductCode(null);
    setViewTab(returnTab);
  };

  const openDetail = (code: string) => {
    if (pickMode || formOpen) return;
    void (async () => {
      if (!(await loadCatalogueForInteraction())) return;
      setDetailProductCode(code);
    })();
  };

  const handleDrawerClose = () => {
    if (productSaveBusy) return;
    if (formOpen) {
      closeForm();
      return;
    }
    setDetailProductCode(null);
  };

  const showLibrary = viewTab === 'library' || (pickMode && returnTab === 'library');
  const showModules = viewTab === 'modules' || (pickMode && returnTab === 'modules');

  const drawerProduct = formOpen ? draftPreview : detailProduct;
  const drawerOpen = formOpen ? Boolean(draftPreview) : Boolean(detailProductCode);

  return (
    <div className={`tp-shell${formOpen ? ' tp-shell--editing' : ''}`}>
      <header className={`tp-shell-toolbar${pickMode && !formOpen ? ' tp-shell-toolbar--manage' : ''}`}>
        <div className="tp-seg" role="tablist" aria-label="Tour products views">
          <button
            type="button"
            role="tab"
            aria-selected={shellMode === 'catalog'}
            className={`tp-seg-btn${shellMode === 'catalog' ? ' on' : ''}`}
            onClick={() => setShellMode('catalog')}
          >
            Catalog
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={shellMode === 'modules'}
            className={`tp-seg-btn${shellMode === 'modules' ? ' on' : ''}`}
            onClick={() => setShellMode('modules')}
          >
            Modules
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={shellMode === 'manage'}
            className={`tp-seg-btn${shellMode === 'manage' ? ' on' : ''}`}
            onClick={() => setShellMode('manage')}
            disabled={catalogueLoading}
          >
            Manage
          </button>
        </div>

        <div className="tp-shell-search">
          <input
            type="search"
            placeholder={
              pickMode
                ? 'Find product to edit…'
                : shellMode === 'modules'
                  ? 'Search modules…'
                  : 'Search name, code, destination…'
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Search products"
            disabled={formOpen}
          />
        </div>

        <div className="tp-shell-actions">
          <span className="tp-shell-stat">
            <strong>{shownCount}</strong> shown
          </span>

          <div className="tp-shell-shortcuts">
            <button
              type="button"
              className="tp-shell-icon-btn"
              aria-expanded={shortcutsOpen}
              onClick={() => setShortcutsOpen((o) => !o)}
            >
              Shortcuts
            </button>
            {shortcutsOpen && (
              <div className="tp-shell-shortcuts-menu">
                <Link href="/attractions" className="tp-shell-shortcuts-item" onClick={() => setShortcutsOpen(false)}>
                  Museum Hours & Closures
                </Link>
                <Link href="/posttour" className="tp-shell-shortcuts-item" onClick={() => setShortcutsOpen(false)}>
                  Post-Tour Feedback
                </Link>
              </div>
            )}
          </div>

          {!pickMode && !formOpen && (
            <button
              type="button"
              className="btn btn-s btn-sm"
              onClick={() => setImportOpen(true)}
              disabled={!canWrite}
              title={!canWrite ? 'You need write permission for Products to import products' : undefined}
            >
              Import
            </button>
          )}

          {pickMode && !formOpen && (
            <>
              <button
                type="button"
                className="btn btn-p btn-sm"
                onClick={openFormForNew}
                disabled={!canWrite}
                title={!canWrite ? 'You need write permission for Products to add a product' : undefined}
              >
                + New Product
              </button>
              <button
                type="button"
                className="btn btn-s btn-sm"
                onClick={() => {
                  exitPickMode();
                  setViewTab(returnTab);
                }}
              >
                Done
              </button>
            </>
          )}
        </div>
      </header>

      {pickMode && !formOpen && (
        <div className="tp-manage-bar">
          <span>
            <strong>Manage mode</strong> — click a product to edit. Filters stay as you left them.
          </span>
        </div>
      )}

      {showLibrary && (
        <ProductLibrary
          search={libSearch}
          onSearchChange={setLibSearch}
          region={region}
          onRegionChange={setRegion}
          duration={duration}
          onDurationChange={setDuration}
          category={category}
          onCategoryChange={setCategory}
          destFilter={destFilter}
          onDestFilterChange={setDestFilter}
          pricingStatus={pricingStatus}
          onPricingStatusChange={setPricingStatus}
          pickMode={pickMode && !formOpen}
          onOpenDetail={openDetail}
          onPickProduct={openFormForProduct}
          onShownCountChange={setShownCount}
        />
      )}

      {showModules && (
        <ModulesView
          search={modSearch}
          pickMode={pickMode && !formOpen}
          onPickProduct={openFormForProduct}
          onOpenDetail={openDetail}
          onShownCountChange={setShownCount}
        />
      )}

      <ProductDetailDrawer
        product={drawerProduct}
        open={drawerOpen}
        mode={formOpen ? 'preview' : 'view'}
        onClose={handleDrawerClose}
        onEdit={formOpen ? undefined : openFormForProduct}
        canWrite={canWrite}
      />

      <ProductEditPanel
        open={formOpen}
        product={editProduct}
        isNew={isNew}
        sourceTab={returnTab}
        externalError={saveError}
        onDismissError={() => setSaveError(null)}
        onClose={closeForm}
        onSave={handleSave}
        onDelete={!isNew ? handleDelete : undefined}
        onDraftChange={handleDraftChange}
      />

      <PortfolioImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(count) => {
          toast.success(
            `Imported ${count} products to Supabase.\n` +
              'Empty pricing rows were created for each product (linked by code). Open Pricing to enter tiers later.',
            5000
          );
        }}
      />
    </div>
  );
}
