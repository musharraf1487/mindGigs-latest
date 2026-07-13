import React from 'react';

// Mini formatting syntax used by the description textarea toolbar:
//   **bold**, *italic*, __underline__, and "- " prefixed lines for bullets.
// Everything here is parsed into plain React elements — never injected as
// raw HTML — so rendering user-submitted text this way is always safe.

function parseInline(text, keyPrefix) {
  const nodes = [];
  const regex = /(\*\*.+?\*\*|__.+?__|\*.+?\*)/g;
  let lastIndex = 0;
  let match;
  let i = 0;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('__')) {
      nodes.push(<u key={key}>{token.slice(2, -2)}</u>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Renders formatted, justified text — bullet lines become a real <ul>, plain
// lines become paragraphs, blank lines become spacing.
export function renderFormattedText(text, style) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let currentList = null;

  lines.forEach((line) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList) {
        currentList = [];
        blocks.push({ type: 'list', items: currentList });
      }
      currentList.push(bulletMatch[1]);
    } else {
      currentList = null;
      blocks.push({ type: 'line', text: line });
    }
  });

  return (
    <div style={{ textAlign: 'justify', ...style }}>
      {blocks.map((block, bi) => {
        if (block.type === 'list') {
          return (
            <ul key={`b-${bi}`} style={{ margin: '6px 0', paddingLeft: 20, textAlign: 'left' }}>
              {block.items.map((item, ii) => (
                <li key={ii}>{parseInline(item, `b${bi}-${ii}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.text.trim() === '') return <div key={`b-${bi}`} style={{ height: 8 }} />;
        return (
          <p key={`b-${bi}`} style={{ margin: '0 0 6px' }}>
            {parseInline(block.text, `b-${bi}`)}
          </p>
        );
      })}
    </div>
  );
}
