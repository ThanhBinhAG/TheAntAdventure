'use client';

import { useState } from 'react';
import ModulesView from '@/components/products/ModulesView';
import ProductFormModal from '@/components/products/ProductFormModal';
import ProductLibrary from '@/components/products/ProductLibrary';
import { validateProductCodeInput } from '@/lib/product-code';
import { useStore } from '@/hooks/useStore';
import type { Product } from '@/lib/types';

type ViewTab = 'library' | 'modules';

export default function Products() {
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

  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const exitPickMode = () => {
    setPickMode(false);
    setFormOpen(false);
    setEditProduct(null);
    setIsNew(false);
    setExpandedCode(null);
  };

  const goToViewTab = (tab: ViewTab) => {
    setViewTab(tab);
    exitPickMode();
  };

  const enterPickMode = () => {
    setReturnTab(viewTab);
    setPickMode(true);
    setExpandedCode(null);
  };

  const openFormForProduct = (p: Product) => {
    setEditProduct(p);
    setIsNew(false);
    setFormOpen(true);
  };

  const openFormForNew = () => {
    setEditProduct(null);
    setIsNew(true);
    setSaveError(null);
    setFormOpen(true);
  };

  const handleSave = (product: Product, asDraft: boolean) => {
    const codeInputError = validateProductCodeInput({
      region: product.region,
      dest: product.dest,
      dur: product.dur,
      cat: product.cat,
    });
    if (codeInputError) {
      setSaveError(codeInputError);
      return;
    }

    const status: Product['status'] = asDraft
      ? 'draft'
      : product.status === 'archived'
        ? 'archived'
        : 'active';
    const payload: Product = { ...product, status };
    if (isNew) {
      if (!payload.code.trim()) {
        setSaveError('Product code is missing. Check destination and code type in the form.');
        return;
      }
      if (products.some((p) => p.code === payload.code)) {
        setSaveError(
          `Product code "${payload.code}" already exists. Change destination or code type to generate a different code.`
        );
        return;
      }
      addProduct(payload);
    } else {
      updateProduct(payload.code, payload);
    }
    setSaveError(null);
    exitPickMode();
    setViewTab(returnTab);
  };

  const handleDelete = (code: string) => {
    deleteProduct(code);
    exitPickMode();
    setViewTab(returnTab);
  };

  const handleToggleExpand = (code: string) => {
    if (pickMode) return;
    setExpandedCode((prev) => (prev === code ? null : code));
  };

  const addTabActive = pickMode;

  return (
    <div>
      <div className="tabs">
        <div
          className={`tab${viewTab === 'library' && !pickMode ? ' on' : ''}`}
          onClick={() => goToViewTab('library')}
          role="button"
          tabIndex={0}
        >
          Product Library
        </div>
        <div className={`tab${addTabActive ? ' on' : ''}`} onClick={enterPickMode} role="button" tabIndex={0}>
          + Add / Edit
        </div>
        <div
          className={`tab${viewTab === 'modules' && !pickMode ? ' on' : ''}`}
          onClick={() => goToViewTab('modules')}
          role="button"
          tabIndex={0}
        >
          Modules View
        </div>
      </div>

      {pickMode && !formOpen && (
        <div className="prod-pick-banner">
          <div className="prod-pick-banner-text">
            <span className="prod-pick-banner-icon">{returnTab === 'library' ? '📚' : '🗂'}</span>
            <span>
              <strong>Edit mode</strong> — search to find your product, then click it below. Your filters stay as you left
              them.
            </span>
          </div>
          <div className="prod-pick-banner-actions">
            <button type="button" className="btn btn-p btn-sm" onClick={openFormForNew}>
              + Add New Product
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
          </div>
        </div>
      )}

      {(viewTab === 'library' || (pickMode && returnTab === 'library')) && (
        <ProductLibrary
          products={products}
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
          pickMode={pickMode}
          expandedCode={expandedCode}
          onToggleExpand={handleToggleExpand}
          onPickProduct={openFormForProduct}
        />
      )}

      {(viewTab === 'modules' || (pickMode && returnTab === 'modules')) && (
        <ModulesView
          products={products}
          search={modSearch}
          onSearchChange={setModSearch}
          pickMode={pickMode}
          onPickProduct={openFormForProduct}
          expandedCode={expandedCode}
          onToggleExpand={handleToggleExpand}
        />
      )}

      <ProductFormModal
        open={formOpen}
        product={editProduct}
        isNew={isNew}
        sourceTab={returnTab}
        externalError={saveError}
        onDismissError={() => setSaveError(null)}
        onClose={() => {
          setFormOpen(false);
          setEditProduct(null);
          setIsNew(false);
          setSaveError(null);
        }}
        onSave={handleSave}
        onDelete={!isNew ? handleDelete : undefined}
      />
    </div>
  );
}
