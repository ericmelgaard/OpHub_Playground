import { Fragment, type ReactNode } from 'react';
import type { MenuItem } from '../types';
import { isRichText } from '../lib/richText';
import { labelName, variantLabelName } from '../lib/labelDisplay';

// Renders a description or display name: plain text as-is, or the small HTML subset from the
// editor. Built from DOM nodes, so unknown tags and attributes are dropped.
// `inline` renders inside a line of text (a span): paragraphs and line breaks become a real
// break (breaks="line", for label previews) or a space (breaks="space", for one-line rows).
export function RichText({ value, className, inline, breaks = 'line' }: {
  value: string | null | undefined;
  className?: string;
  inline?: boolean;
  breaks?: 'line' | 'space';
}) {
  if (!value) return null;
  const Wrap = inline ? 'span' : 'div';
  if (!isRichText(value)) {
    return <Wrap className={`${breaks === 'line' ? 'whitespace-pre-line' : ''} ${className ?? ''}`}>{value}</Wrap>;
  }
  const doc = new DOMParser().parseFromString(value, 'text/html');
  const nodes = [...doc.body.childNodes];
  const opts = { inline: !!inline, breaks };
  return (
    <Wrap className={className}>
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {inline && i > 0 && (n as Element).tagName?.toLowerCase() === 'p' && (breaks === 'line' ? <br /> : ' ')}
          {renderNode(n, i, opts)}
        </Fragment>
      ))}
    </Wrap>
  );
}

// A product's name as its label shows it, keeping display name formatting
export function LabelName({ item, breaks = 'space' }: { item: MenuItem; breaks?: 'line' | 'space' }) {
  return !variantLabelName(item) && item.displayName?.trim() && isRichText(item.displayName)
    ? <RichText value={item.displayName} inline breaks={breaks} />
    : <>{labelName(item)}</>;
}

function renderNode(node: ChildNode, key: number, opts: { inline: boolean; breaks: 'line' | 'space' }): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const children = [...node.childNodes].map((n, i) => renderNode(n, i, opts));
  switch ((node as Element).tagName.toLowerCase()) {
    case 'p': return opts.inline ? <Fragment key={key}>{children}</Fragment> : <p key={key} className="min-h-[1em]">{children}</p>;
    case 'br': return opts.inline && opts.breaks === 'space' ? ' ' : <br key={key} />;
    case 'strong': case 'b': return <strong key={key} className="font-semibold">{children}</strong>;
    case 'em': case 'i': return <em key={key}>{children}</em>;
    default: return <Fragment key={key}>{children}</Fragment>;
  }
}
