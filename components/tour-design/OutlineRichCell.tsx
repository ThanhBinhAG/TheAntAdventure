'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OUTLINE_TEXT_COLORS } from '@/lib/outline/outline-rich-text';

function toEditorHtml(value: string): string {
  if (!value) return '';
  if (/<[a-z][\s\S]*?>/i.test(value)) return value;
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

interface Props {
  value?: string;
  placeholder?: string;
  minRows?: number;
  onChange: (html: string) => void;
}

export default function OutlineRichCell({ value = '', placeholder, minRows = 4, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const lastEmitted = useRef(value);

  const syncFromProp = useCallback(() => {
    const el = editorRef.current;
    if (!el || focused) return;
    const html = toEditorHtml(value);
    if (value !== lastEmitted.current && el.innerHTML !== html) {
      el.innerHTML = html;
      lastEmitted.current = value;
    }
  }, [value, focused]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML) return;
    const html = toEditorHtml(value);
    if (html) {
      el.innerHTML = html;
      lastEmitted.current = value;
    }
  }, [value]);

  useEffect(() => {
    syncFromProp();
  }, [syncFromProp]);

  function emitChange() {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML === '<br>' ? '' : el.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }

  function runCmd(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }

  function applyColor(color: string) {
    runCmd('foreColor', color);
  }

  const minHeight = Math.max(44, minRows * 18);

  return (
    <div className={`outline-rich-cell${focused ? ' outline-rich-cell-focused' : ''}`}>
      <div className="outline-rich-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" className="outline-rich-btn" title="Bold" onClick={() => runCmd('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="outline-rich-btn" title="Italic" onClick={() => runCmd('italic')}>
          <em>I</em>
        </button>
        <button type="button" className="outline-rich-btn" title="Underline" onClick={() => runCmd('underline')}>
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <span className="outline-rich-sep" />
        {OUTLINE_TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className="outline-rich-color"
            title={c.label}
            style={{ background: c.value }}
            onClick={() => applyColor(c.value)}
          />
        ))}
        <input
          type="color"
          className="outline-rich-picker"
          title="Custom color"
          defaultValue="#000000"
          onChange={(e) => applyColor(e.target.value)}
        />
      </div>
      <div
        ref={editorRef}
        className="outline-rich-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          emitChange();
        }}
        onInput={emitChange}
      />
    </div>
  );
}
