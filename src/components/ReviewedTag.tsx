import { CheckCircle2 } from 'lucide-react';

// Marks a label you've opened this session, so you can see what's left to look at.
export function ReviewedTag() {
  return (
    <span
      title="Opened this session"
      className="inline-flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded-full border bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    >
      <CheckCircle2 className="h-3 w-3" />
      Reviewed
    </span>
  );
}
