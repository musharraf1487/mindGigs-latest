import React from 'react';
import { Bold, Italic, Underline, List } from 'lucide-react';

const btnStyle = {
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.1)',
  background: '#fff',
  cursor: 'pointer',
  color: 'var(--sl)',
};

// A small formatting toolbar for a plain <textarea> ref, using a lightweight
// **bold** / *italic* / __underline__ / "- " bullet marker syntax (parsed by
// utils/richText.jsx) instead of storing HTML — keeps user text safe to
// render anywhere without sanitization.
export function FormattingToolbar({ textareaRef, value, onChange }) {
  const wrapSelection = (before, after = before, placeholder = 'text') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const hasSelection = end > start;
    const selected = hasSelection ? value.slice(start, end) : placeholder;
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const toggleBulletLines = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const allBulleted = lines.every((l) => l.trim() === '' || /^\s*-\s/.test(l));
    const newLines = lines.map((l) => {
      if (l.trim() === '') return l;
      return allBulleted ? l.replace(/^(\s*)-\s/, '$1') : `- ${l}`;
    });
    const newBlock = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(lineStart, lineStart + newBlock.length);
    });
  };

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
      <button type="button" title="Bold" onClick={() => wrapSelection('**')} style={btnStyle}><Bold size={14} /></button>
      <button type="button" title="Italic" onClick={() => wrapSelection('*')} style={btnStyle}><Italic size={14} /></button>
      <button type="button" title="Underline" onClick={() => wrapSelection('__')} style={btnStyle}><Underline size={14} /></button>
      <button type="button" title="Bullet list" onClick={toggleBulletLines} style={btnStyle}><List size={14} /></button>
    </div>
  );
}
