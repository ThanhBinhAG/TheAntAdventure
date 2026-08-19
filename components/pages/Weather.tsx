'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import FeaturedWeatherRow from '@/components/weather/week/FeaturedWeatherRow';
import ProvinceCardGrid from '@/components/weather/destinations/ProvinceCardGrid';
import { useWeatherPageBoot } from '@/components/weather/hooks/useWeatherPageBoot';
import { toast } from '@/lib/toast';

const WeatherDetailModal = dynamic(() => import('@/components/weather/week/WeatherDetailModal'), {
  ssr: false,
});
const AddProvinceModal = dynamic(() => import('@/components/weather/destinations/AddProvinceModal'), {
  ssr: false,
});
const EditProvinceModal = dynamic(() => import('@/components/weather/destinations/EditProvinceModal'), {
  ssr: false,
});
const FeaturedSlotsModal = dynamic(() => import('@/components/weather/destinations/FeaturedSlotsModal'), {
  ssr: false,
});

export default function Weather() {
  const {
    destinations,
    featured,
    explore,
    loading,
    error,
    create,
    update,
    remove,
    setFeatured,
    reload,
  } = useWeatherPageBoot();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const detailMeta = useMemo(
    () => destinations.find((d) => d.id === detailId) ?? null,
    [destinations, detailId]
  );
  const editMeta = useMemo(
    () => destinations.find((d) => d.id === editId) ?? null,
    [destinations, editId]
  );

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/weather/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Refresh failed');
      await reload();
      setCacheVersion((n) => n + 1);
      toast.success('The weather data has been updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh the weather data.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="wg-page">
      <header className="wg-page-hd">
        <div>
          <h1 className="wg-page-title">Weather Guide</h1>
          <p className="wg-page-sub">
            Best weather for your trip to Vietnam.
          </p>
        </div>
        <div className="wg-page-actions">
          <button type="button" className="btn btn-s btn-sm" onClick={() => setFeaturedOpen(true)}>
            Edit featured destinations
          </button>
          <button
            type="button"
            className="btn btn-s btn-sm"
            onClick={() => void handleRefreshAll()}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh cache'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="wg-error">
          {error}{' '}
          <button type="button" className="btn btn-s btn-sm" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      ) : null}

      <section className="wg-section" aria-labelledby="wg-featured-heading">
        <div className="wg-section-hd">
          <h2 id="wg-featured-heading" className="wg-section-heading">
            Featured destinations
          </h2>
        </div>
        <FeaturedWeatherRow
          destinations={featured}
          loading={loading}
          onOpenDetail={setDetailId}
          onEdit={setEditId}
          cacheVersion={cacheVersion}
        />
      </section>

      <section className="wg-section" aria-labelledby="wg-explore-heading">
        <div className="wg-section-hd">
          <h2 id="wg-explore-heading" className="wg-section-heading">
            Explore other destinations
          </h2>
          <p className="wg-section-sub">Tap the destination to view the weather (only call API when needed).</p>
        </div>
        <ProvinceCardGrid
          destinations={explore}
          loading={loading}
          onSelect={setDetailId}
          onEdit={setEditId}
        />
        <div className="wg-add-row">
          <button type="button" className="btn btn-p" onClick={() => setAddOpen(true)}>
            + Add new province
          </button>
        </div>
      </section>

      {detailId ? (
        <WeatherDetailModal
          open
          destinationId={detailId}
          meta={detailMeta}
          onClose={() => setDetailId(null)}
        />
      ) : null}

      {addOpen ? (
        <AddProvinceModal
          open
          featuredCount={featured.length}
          onClose={() => setAddOpen(false)}
          onSave={async (input) => {
            await create(input);
          }}
        />
      ) : null}

      {editId ? (
        <EditProvinceModal
          open
          destination={editMeta}
          featuredCount={featured.length}
          onClose={() => setEditId(null)}
          onSave={async (id, patch) => {
            await update(id, patch);
          }}
          onDelete={async (id) => {
            await remove(id);
          }}
        />
      ) : null}

      {featuredOpen ? (
        <FeaturedSlotsModal
          open
          destinations={destinations}
          featuredIds={featured.map((d) => d.id)}
          onClose={() => setFeaturedOpen(false)}
          onSave={async (ids) => {
            await setFeatured(ids);
            setCacheVersion((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
