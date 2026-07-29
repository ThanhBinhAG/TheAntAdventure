import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeOutlineHtml } from '../lib/outline/outline-rich-text';

describe('outline-rich-text', () => {
  it('escapes plain text and preserves line breaks', () => {
    assert.equal(sanitizeOutlineHtml('Hello\nWorld'), 'Hello<br>World');
  });

  it('strips script tags', () => {
    const out = sanitizeOutlineHtml('Safe<script>alert(1)</script><b>bold</b>');
    assert.match(out, /<b>bold<\/b>/);
    assert.doesNotMatch(out, /script/i);
  });

  it('keeps bold italic underline', () => {
    const out = sanitizeOutlineHtml('<p><b>Bold</b> <i>italic</i> <u>under</u></p>');
    assert.match(out, /<b>Bold<\/b>/);
    assert.match(out, /<i>italic<\/i>/);
    assert.match(out, /<u>under<\/u>/);
  });

  it('keeps span color style', () => {
    const out = sanitizeOutlineHtml('<span style="color:#C00000">Notes:</span> text');
    assert.match(out, /color:#C00000/);
    assert.match(out, /Notes:/);
  });
});
