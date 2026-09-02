import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('hooks/useLanguage.ts', 'utf8');

test('useLanguage keeps translation callbacks stable until the language changes', () => {
  assert.match(source, /import \{ useCallback, useMemo \} from 'react';/);

  for (const callback of ['t', 'pageTitle', 'tc', 'tsf', 'tac', 'tStage', 'tLostReason', 'tp']) {
    assert.match(
      source,
      new RegExp(`const ${callback} = useCallback\\([\\s\\S]*?\\[language\\]\\);`),
      `${callback} must not be recreated by an unrelated Zustand update`
    );
  }

  assert.match(source, /return useMemo\(/);
});
