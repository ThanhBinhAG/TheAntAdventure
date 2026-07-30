'use client';

import { Fragment, useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EditableSection from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import type { AccCruiseRate, AccProperty, AccRoomRate } from '@/lib/pricing/catalog-types';

type Props = {
  properties: AccProperty[];
  roomRates: AccRoomRate[];
  cruiseRates: AccCruiseRate[];
  onPatch: (id: string, patch: Partial<AccProperty>) => Promise<void>;
};

const APPROVED_TONE: Record<string, string> = {
  YES: 'bdg-g',
  NOTYET: 'bdg-w',
};

function approvedClass(value: string): string {
  const key = value.trim().toUpperCase();
  if (APPROVED_TONE[key]) return APPROVED_TONE[key];
  return key ? 'bdg-a' : 'bdg-w';
}

export default function AccPropertyTable({ properties, roomRates, cruiseRates, onPatch }: Props) {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [stars, setStars] = useState('');
  const [approved, setApproved] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const options = useMemo(
    () => ({
      regions: Array.from(new Set(properties.map((p) => p.region).filter(Boolean))),
      types: Array.from(new Set(properties.map((p) => p.type).filter(Boolean))).sort(),
      stars: Array.from(new Set(properties.map((p) => p.stars).filter(Boolean))).sort(),
      approvals: Array.from(new Set(properties.map((p) => p.approved).filter(Boolean))).sort(),
    }),
    [properties]
  );

  const ratesByProperty = useMemo(() => {
    const map = new Map<string, AccRoomRate[]>();
    for (const rate of roomRates) {
      const key = rate.propertyName.trim().toLowerCase();
      const bucket = map.get(key);
      if (bucket) bucket.push(rate);
      else map.set(key, [rate]);
    }
    return map;
  }, [roomRates]);

  const cabinsByProperty = useMemo(() => {
    const map = new Map<string, AccCruiseRate[]>();
    for (const rate of cruiseRates) {
      const key = rate.propertyName.trim().toLowerCase();
      const bucket = map.get(key);
      if (bucket) bucket.push(rate);
      else map.set(key, [rate]);
    }
    return map;
  }, [cruiseRates]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return properties.filter((p) => {
      if (region && p.region !== region) return false;
      if (type && p.type !== type) return false;
      if (stars && p.stars !== stars) return false;
      if (approved && p.approved !== approved) return false;
      if (!needle) return true;
      return [p.name, p.location, p.ownership, p.address].some((f) => f.toLowerCase().includes(needle));
    });
  }, [properties, search, region, type, stars, approved]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, region, type, stars, approved, pageSize]);
  const { paginatedItems } = pagination;

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search property, city, owner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {options.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {options.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={stars} onChange={(e) => setStars(e.target.value)}>
          <option value="">All ratings</option>
          {options.stars.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={approved} onChange={(e) => setApproved(e.target.value)}>
          <option value="">Any status</option>
          {options.approvals.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <span className="pcx-muted">
          {filtered.length} of {properties.length}
        </span>
      </div>

      <div className="card">
        <div className="card-body pcx-table-wrap">
          <table className="tbl pcx-table">
            <thead>
              <tr>
                <th className="pcx-col-chevron" />
                <th>Property</th>
                <th>Region</th>
                <th>Location</th>
                <th>Type</th>
                <th>Stars</th>
                <th>Ownership</th>
                <th className="pcx-num">Rates</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((property) => {
                const open = expanded === property.id;
                const key = property.name.trim().toLowerCase();
                const rates = ratesByProperty.get(key) ?? [];
                const cabins = cabinsByProperty.get(key) ?? [];
                const rateCount = rates.length + cabins.length;

                return (
                  <Fragment key={property.id}>
                    <tr
                      className={`pcx-row${open ? ' open' : ''}`}
                      onClick={() => setExpanded(open ? null : property.id)}
                    >
                      <td className="pcx-col-chevron">
                        <span className={`pcx-chevron${open ? ' open' : ''}`}>▸</span>
                      </td>
                      <td>
                        <b>{property.name}</b>
                      </td>
                      <td className="pcx-muted">{property.region || '—'}</td>
                      <td>{property.location || '—'}</td>
                      <td>
                        {property.type ? <span className="bdg bdg-b">{property.type}</span> : '—'}
                      </td>
                      <td className="pcx-muted">{property.stars || '—'}</td>
                      <td className="pcx-muted">{property.ownership || '—'}</td>
                      <td className="pcx-num">{rateCount || <span className="pcx-muted">0</span>}</td>
                      <td>
                        <span className={`bdg ${approvedClass(property.approved)}`}>
                          {property.approved || '—'}
                        </span>
                      </td>
                    </tr>

                    {open && (
                      <tr className="pcx-expand-row">
                        <td colSpan={9}>
                          <PropertyDetail
                            property={property}
                            rates={rates}
                            cabins={cabins}
                            onPatch={onPatch}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="pcx-empty">
                    No properties match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}

function PropertyDetail({
  property,
  rates,
  cabins,
  onPatch,
}: {
  property: AccProperty;
  rates: AccRoomRate[];
  cabins: AccCruiseRate[];
  onPatch: (id: string, patch: Partial<AccProperty>) => Promise<void>;
}) {
  const field = (
    editing: boolean,
    label: string,
    value: string,
    key: keyof AccProperty,
    multiline = false
  ) => (
    <div>
      <dt>{label}</dt>
      <dd>
        <InlineEdit
          editing={editing}
          value={value}
          type={multiline ? 'multiline' : 'text'}
          placeholder="Not recorded"
          onSave={(v) => onPatch(property.id, { [key]: String(v ?? '') })}
        />
      </dd>
    </div>
  );

  const seasons = Array.from(new Set(rates.map((r) => r.season).filter(Boolean)));
  const sellPrices = rates.map((r) => r.sellPrice).filter((v): v is number => v != null);

  return (
    <div className="pcx-detail" onClick={(e) => e.stopPropagation()}>
      <div className="pcx-detail-grid">
        <EditableSection title="Property">
          {({ editing }) => (
            <dl className="pcx-facts">
              {field(editing, 'Name', property.name, 'name')}
              {field(editing, 'Region', property.region, 'region')}
              {field(editing, 'Location', property.location, 'location')}
              {field(editing, 'Type', property.type, 'type')}
              {field(editing, 'Star rating', property.stars, 'stars')}
              {field(editing, 'Ownership', property.ownership, 'ownership')}
              <div>
                <dt>Website</dt>
                <dd>
                  {editing || !property.website ? (
                    <InlineEdit
                      editing={editing}
                      value={property.website}
                      placeholder="Add a website"
                      onSave={(v) => onPatch(property.id, { website: String(v ?? '') })}
                    />
                  ) : (
                    <a href={property.website} target="_blank" rel="noreferrer" className="pcx-link">
                      {property.website}
                    </a>
                  )}
                </dd>
              </div>
              {field(editing, 'Address', property.address, 'address', true)}
            </dl>
          )}
        </EditableSection>

        <EditableSection title="Contacts">
          {({ editing }) => (
            <dl className="pcx-facts">
              {field(editing, 'Reservations', property.reservationsContact, 'reservationsContact', true)}
              {field(editing, 'Sales', property.salesContact, 'salesContact', true)}
              {field(editing, 'Factsheet & photos', property.factsheetLink, 'factsheetLink', true)}
            </dl>
          )}
        </EditableSection>

        <EditableSection title="Commercial">
          {({ editing }) => (
            <>
              <dl className="pcx-facts">
                {field(editing, 'Approved for use', property.approved, 'approved')}
                {field(editing, 'Contract renewal', property.contractRenewal, 'contractRenewal', true)}
                {field(editing, 'Bank account', property.bankAccount, 'bankAccount', true)}
              </dl>
              {(rates.length > 0 || cabins.length > 0) && (
                <div className="pcx-mini-stats">
                  <span>
                    <b>{rates.length + cabins.length}</b> rate rows
                  </span>
                  {seasons.length > 0 && (
                    <span>
                      <b>{seasons.length}</b> seasons
                    </span>
                  )}
                  {sellPrices.length > 0 && (
                    <span>
                      from <b>${Math.min(...sellPrices)}</b>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </EditableSection>
      </div>

      {rates.length > 0 && (
        <section className="pcx-detail-block">
          <h4 className="pcx-detail-title">
            Room rates
            <span className="pcx-detail-hint">From the regional rate sheets</span>
          </h4>
          <div className="pcx-table-wrap">
            <table className="tbl pcx-table pcx-subtable">
              <thead>
                <tr>
                  <th>Room type</th>
                  <th>Season</th>
                  <th>Period</th>
                  <th className="pcx-num">VND / room / night</th>
                  <th className="pcx-num">USD cost</th>
                  <th className="pcx-num">Sell</th>
                  <th className="pcx-num">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td>{rate.roomType}</td>
                    <td>{rate.season || <span className="pcx-muted">—</span>}</td>
                    <td className="pcx-muted">
                      {[rate.periodFrom, rate.periodTo].filter(Boolean).join(' → ') || '—'}
                    </td>
                    <td className="pcx-num">
                      {rate.vndCost != null ? rate.vndCost.toLocaleString('en-US') : '—'}
                    </td>
                    <td className="pcx-num">{rate.usdCost != null ? `$${rate.usdCost}` : '—'}</td>
                    <td className="pcx-num">{rate.sellPrice != null ? `$${rate.sellPrice}` : '—'}</td>
                    <td className="pcx-num">{rate.margin != null ? `$${rate.margin}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {cabins.length > 0 && (
        <section className="pcx-detail-block">
          <h4 className="pcx-detail-title">Cabin rates</h4>
          <div className="pcx-table-wrap">
            <table className="tbl pcx-table pcx-subtable">
              <thead>
                <tr>
                  <th>Cabin</th>
                  <th className="pcx-num">Cost 2026</th>
                  <th className="pcx-num">Cost 2027</th>
                  <th className="pcx-num">Sell 2026</th>
                  <th className="pcx-num">Sell 2027</th>
                </tr>
              </thead>
              <tbody>
                {cabins.map((cabin) => (
                  <tr key={cabin.id}>
                    <td>{cabin.roomType}</td>
                    <td className="pcx-num">{cabin.cost2026 != null ? `$${cabin.cost2026}` : '—'}</td>
                    <td className="pcx-num">{cabin.cost2027 != null ? `$${cabin.cost2027}` : '—'}</td>
                    <td className="pcx-num">{cabin.sell2026 != null ? `$${cabin.sell2026}` : '—'}</td>
                    <td className="pcx-num">{cabin.sell2027 != null ? `$${cabin.sell2027}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!rates.length && !cabins.length && (
        <p className="pcx-muted">
          No rates imported for this property yet — add them in the regional sheet or import an updated workbook.
        </p>
      )}
    </div>
  );
}
