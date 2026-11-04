// Product descriptions are plain text (from Webtrition) or a small HTML subset written in the
// product sheet: paragraphs, line breaks, bold and italic. Nothing else is ever rendered.

export const isRichText = (s: string | null | undefined) => !!s && /<(p|br|strong|em|b|i)\b/i.test(s);

// Text only, for search, counts and places that can't show formatting
export function plainText(s: string | null | undefined): string {
  if (!s) return '';
  if (!isRichText(s)) return s;
  const doc = new DOMParser().parseFromString(s, 'text/html');
  doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  return [...doc.body.querySelectorAll('p')].length
    ? [...doc.body.querySelectorAll('p')].map(p => p.textContent ?? '').join('\n').trim()
    : (doc.body.textContent ?? '').trim();
}

// Ingredients arrive as one comma-separated string ("Chicken Breast^, Black Beans (in Water)").
// Split on commas outside parentheses, drop Webtrition's trailing ^ (it marks a sub-recipe;
// deliberately not shown), and remove repeats.
export function parseIngredients(s: string | null | undefined): string[] {
  if (!s) return [];
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; } else current += ch;
  }
  parts.push(current);
  const seen = new Set<string>();
  return parts
    .map(p => p.trim().replace(/\^+$/, '').trim())
    .filter(p => {
      const key = p.toLowerCase();
      if (!p || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
