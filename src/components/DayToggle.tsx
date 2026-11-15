import type { DisplayToggle } from './InlineItemPicker';

// Off / Auto / On for an item on a label page (Off / On when it isn't linked to a source)
export function ThreeStageToggle({ state, onChange, disabledReason, allowAuto = true }: {
  state: DisplayToggle | 'mixed';
  onChange: (s: DisplayToggle) => void;
  // Auto follows the source's days; items not linked to a source only get Off / On
  allowAuto?: boolean;
  // Shown as the tooltip when the toggle can't be used
  disabledReason?: string;
}) {
  const states: { value: DisplayToggle; label: string; activeClass: string }[] = [
    { value: 'off', label: 'Off', activeClass: 'bg-gray-400 text-white' },
    ...(allowAuto ? [{ value: 'auto' as const, label: 'Auto', activeClass: 'bg-sky-500 text-white' }] : []),
    { value: 'on', label: 'On', activeClass: 'bg-emerald-500 text-white' },
  ];
  return (
    <div
      title={disabledReason ?? (state === 'mixed' ? 'Days differ; pick one to set every day'
        : !allowAuto ? 'Not linked to a source, so there are no days to follow. Turn it on for the days it should show.'
        : undefined)}
      className={`flex items-center bg-gray-100 dark:bg-gray-700 rounded-md p-0.5 flex-shrink-0 ${
        state === 'mixed' ? 'ring-1 ring-amber-300 dark:ring-amber-700' : ''
      } ${disabledReason ? 'opacity-50' : ''}`}
    >
      {states.map(s => (
        <button
          key={s.value}
          disabled={!!disabledReason}
          onClick={(e) => { e.stopPropagation(); onChange(s.value); }}
          className={`min-w-[40px] h-9 px-2 text-xs font-semibold rounded transition-all disabled:cursor-not-allowed ${
            state === s.value ? s.activeClass : 'text-gray-500 dark:text-gray-400 enabled:hover:text-gray-700 dark:enabled:hover:text-gray-200'
          }`}
        >{s.label}</button>
      ))}
    </div>
  );
}

// On some days only, so not in the Every day preview
export function SomeDaysTag() {
  return (
    <span
      title="Not on every day, so it isn't in the Every day preview"
      className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0"
    >
      Some days
    </span>
  );
}
