'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import { useStore } from '@/hooks/useStore';
import type { Product } from '@/lib/types';

type ProdTab = 'library' | 'add' | 'modules';

export default function Products() {
  const products = useStore((s) => s.products);
  const [tab, setTab] = useState<ProdTab>('library');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('');
  const [destFilter, setDestFilter] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      if (region && p.region !== region) return false;
      if (duration && p.dur !== duration) return false;
      if (category && !p.cat.toLowerCase().includes(category.toLowerCase())) return false;
      if (destFilter && !p.dest.toLowerCase().includes(destFilter.toLowerCase())) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.desc.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, search, region, duration, category, destFilter]);

  const byDest = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      const key = p.dest || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filtered]);

  const modules = useMemo(() => {
    const map: Record<string, Record<string, Product[]>> = {};
    products.forEach((p) => {
      const r = p.region || 'other';
      const d = p.dur || 'Other';
      if (!map[r]) map[r] = {};
      if (!map[r][d]) map[r][d] = [];
      map[r][d].push(p);
    });
    return map;
  }, [products]);

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['library', 'Product Library'],
            ['add', '+ Add / Edit'],
            ['modules', 'Modules View'],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'library' && (
        <>
          <div className="search-row">
            <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">All Regions</option>
              <option value="north">Northern</option>
              <option value="central">Central</option>
              <option value="south">Southern</option>
              <option value="services">Services</option>
            </select>
            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
              <option value="">All Durations</option>
              <option>Half Day</option>
              <option>Full Day</option>
              <option>2 Days 1 Night</option>
              <option>3 Days 2 Nights</option>
              <option>4 Days 3 Nights</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              <option>Cultural</option>
              <option>Transfer</option>
              <option>Culinary</option>
              <option>Cycling</option>
              <option>Nature</option>
              <option>Service</option>
            </select>
            <input
              placeholder="Filter destination…"
              value={destFilter}
              onChange={(e) => setDestFilter(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--b)', borderRadius: 7, fontSize: 12.5, maxWidth: 160 }}
            />
            <span className="bdg bdg-g">{filtered.length} products</span>
          </div>

          <div className="prod-quick-links">
            <span>
              🏛 <b>Planning a site visit?</b>
            </span>
            <Link href="/attractions" className="btn btn-s btn-sm">
              → Check Museum Hours & Closures
            </Link>
            <span style={{ marginLeft: 8 }}>
              ⭐ <b>Tour done?</b>
            </span>
            <Link href="/posttour" className="btn btn-s btn-sm">
              → Log Post-Tour Feedback
            </Link>
          </div>

          <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
            {filtered.length} products found{' '}
            <span style={{ fontSize: 11.5, color: 'var(--m)', fontWeight: 400 }}>
              from {Object.keys(byDest).length} destinations
            </span>
          </div>

          {Object.keys(byDest)
            .sort()
            .map((dest) => (
              <div key={dest} style={{ marginBottom: 18 }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gd)' }}>📍 {dest}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--m)' }}>
                    {byDest[dest].length} product{byDest[dest].length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="prod-grid">
                  {byDest[dest].map((p) => (
                    <ProductCard key={p.code} product={p} />
                  ))}
                </div>
              </div>
            ))}
        </>
      )}

      {tab === 'add' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Add New Product / Thêm sản phẩm mới</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 13 }}>
              <div className="fg">
                <label className="lbl">
                  Region <span className="req">*</span>
                </label>
                <select defaultValue="north">
                  <option value="north">Northern Vietnam</option>
                  <option value="central">Central Vietnam</option>
                  <option value="south">Southern Vietnam</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">
                  Duration <span className="req">*</span>
                </label>
                <select>
                  <option>Half Day</option>
                  <option>Full Day</option>
                  <option>2 Days 1 Night</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Category</label>
                <select>
                  <option>cultural</option>
                  <option>culinary</option>
                  <option>adventure</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">
                  Name (EN) <span className="req">*</span>
                </label>
                <input placeholder="e.g. Halong Bay Overnight Cruise" />
              </div>
              <div className="fg">
                <label className="lbl">Base Cost / pax (USD)</label>
                <input type="number" defaultValue={80} />
              </div>
              <div className="fg">
                <label className="lbl">Status</label>
                <select>
                  <option>Active</option>
                  <option>Draft</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="fg">
                <label className="lbl">Description (EN)</label>
                <textarea placeholder="2–3 evocative sentences for client-facing materials…" />
              </div>
              <div className="fg">
                <label className="lbl">Highlights / Key Experiences</label>
                <textarea placeholder="Bhaya Cruise · Sea kayaking · Cooking class…" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
              <button className="btn btn-s" type="button" onClick={() => setTab('library')}>
                Cancel
              </button>
              <button className="btn btn-s" type="button">
                Save as Draft
              </button>
              <button className="btn btn-p" type="button">
                ✓ Save & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'modules' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">All Products by Region & Duration</span>
          </div>
          <div className="card-body">
            {Object.entries(modules).map(([reg, durs]) => {
              const [rbg, rfg] = REG_COLORS_HEX[reg as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
              return (
                <div key={reg} style={{ marginBottom: 20 }}>
                  <span className="prod-region-badge" style={{ background: rbg, color: rfg }}>
                    {REG_LABELS[reg as keyof typeof REG_LABELS] || reg}
                  </span>
                  {Object.entries(durs).map(([dur, prods]) => (
                    <div key={dur} style={{ marginTop: 10, marginLeft: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--m)', marginBottom: 6 }}>{dur}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {prods.slice(0, 12).map((p) => (
                          <span key={p.code} className="dur-pill" title={p.name}>
                            {p.code}
                          </span>
                        ))}
                        {prods.length > 12 && <span className="dur-pill">+{prods.length - 12} more</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const [rbg, rfg] = REG_COLORS_HEX[p.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  return (
    <div className="prod-card">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <code className="pl-code">{p.code}</code>
        <span className="prod-region-badge" style={{ background: rbg, color: rfg, fontSize: 9.5 }}>
          {REG_LABELS[p.region as keyof typeof REG_LABELS] || p.region}
        </span>
        {p.dur && <span className="dur-pill">{p.dur}</span>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginTop: 4 }}>{p.name}</div>
      <div style={{ fontSize: 10.5, color: 'var(--m)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {p.cat} · {p.lvl}
      </div>
      {p.desc && (
        <div style={{ fontSize: 11.5, color: 'var(--m)', lineHeight: 1.5, marginTop: 4 }}>
          {p.desc.slice(0, 200)}
          {p.desc.length > 200 ? '…' : ''}
        </div>
      )}
      {p.usp && (
        <div className="prod-usp">{p.usp.slice(0, 150).replace(/\n/g, ' · ')}</div>
      )}
      {p.price && (
        <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, marginTop: 4 }}>
          Price: {p.price}
        </div>
      )}
    </div>
  );
}
