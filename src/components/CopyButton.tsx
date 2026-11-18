import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

// A small copy icon that sits right after an ID (see "IDs → copy button" in CLAUDE.md).
// Copies the value, shows a green check for a moment, and never triggers the card or row it's in.
export function CopyButton({ value, label = 'ID', size = 'sm' }: {
  value: string;
  // What's being copied, for the tooltip and screen readers ("ID", "MRN", "device ID")
  label?: string;
  // xs for dense cards and rows, sm for headers and detail views
  size?: 'xs' | 'sm';
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied): nothing to show
    }
  };

  // xs fits inside a text-xs line, so rows and cards don't get taller
  const box = size === 'xs' ? 'h-4 w-4' : 'h-6 w-6';
  const icon = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied' : `Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label} ${value}`}
      className={`${box} inline-flex items-center justify-center flex-shrink-0 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
    >
      {copied ? <Check className={`${icon} text-emerald-600 dark:text-emerald-400`} /> : <Copy className={icon} />}
    </button>
  );
}
