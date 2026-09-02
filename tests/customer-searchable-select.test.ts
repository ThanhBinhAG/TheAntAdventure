import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { filterSearchableOptions } from '@/lib/customers/searchable-options';

test('filters Country and Nationality choices case-insensitively', () => {
  const options = ['United States', 'United Kingdom', 'Vietnam'];
  assert.deepEqual(filterSearchableOptions(options, 'uni'), ['United States', 'United Kingdom']);
  assert.deepEqual(filterSearchableOptions(options, 'VIET'), ['Vietnam']);
  assert.deepEqual(filterSearchableOptions(options, ''), options);
});

test('Customer form uses keyboard-accessible searchable comboboxes instead of tall datalists', () => {
  const root = process.cwd();
  const form = readFileSync(join(root, 'components/customers/CustomerFormModal.tsx'), 'utf8');
  const combobox = readFileSync(join(root, 'components/SearchableSelect.tsx'), 'utf8');
  const css = readFileSync(join(root, 'app/globals.css'), 'utf8');

  assert.match(form, /<SearchableSelect/);
  assert.doesNotMatch(form, /nc-country-list|nc-nationality-list/);
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /role="listbox"/);
  assert.match(combobox, /searchable-select__control/);
  assert.match(combobox, /const \[query, setQuery\] = useState\(''\)/);
  assert.match(combobox, /filterSearchableOptions\(options, query\)/);
  assert.match(combobox, /filtered\.findIndex\(\(option\) => option === value\)/);
  assert.match(combobox, /ArrowDown/);
  assert.match(combobox, /Enter/);
  assert.match(combobox, /Escape/);
  assert.match(css, /\.searchable-select__control\{[^}]*border:1px solid var\(--b\)[^}]*border-radius:7px/);
  assert.match(css, /\.searchable-select__control input\{[^}]*border:0!important/);
  assert.match(css, /\.searchable-select__options\{[^}]*top:100%[^}]*max-height:300px[^}]*overflow-y:auto[^}]*border:1px solid #1a1a1a[^}]*border-radius:0!important[^}]*box-shadow:none/);
  assert.match(css, /\.searchable-select__option\.is-active\{background:var\(--blue\);color:#fff\}/);
});
