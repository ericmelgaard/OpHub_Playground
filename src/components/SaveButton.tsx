import { Save, ChevronDown, ListChecks, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// The one Save button (see "Saving changes" in CLAUDE.md): Save with the change count, and a
// chevron that opens the related actions (Save, Review changes, Discard changes). Off until
// something changes. Label edits and product edits both use it.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

interface SaveButtonProps {
  count: number;
  saving?: boolean;
  onSave: () => void;
  onReview?: () => void;
  onDiscard: () => void;
  // "pending change" on labels, "change" in forms
  noun?: string;
  // Submit a form instead of calling onSave on click
  form?: string;
  // Footer of a sheet: taller touch target and full width
  block?: boolean;
}

export function SaveButton({ count, saving = false, onSave, onReview, onDiscard, noun = 'change', form, block = false }: SaveButtonProps) {
  const none = count === 0;
  const height = block ? 'h-11' : 'h-9';
  return (
    <div className={`flex items-stretch ${block ? 'flex-1' : ''}`}>
      <Button
        type={form ? 'submit' : 'button'}
        form={form}
        onClick={form ? undefined : onSave}
        disabled={saving || none}
        title={none ? 'No changes to save' : `${plural(count, noun)}. Save applies them.`}
        className={`${height} ${block ? 'flex-1' : ''} rounded-r-none gap-1.5 px-3`}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span className={block ? '' : 'hidden sm:inline'}>{saving ? 'Saving…' : 'Save'}</span>
        {!none && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/25 text-xs font-semibold tabular-nums flex items-center justify-center">
            {count}
          </span>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            disabled={saving || none}
            aria-label="Save options"
            className={`${height} rounded-l-none px-2 border-l border-white/30`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{plural(count, noun)}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={onSave}>
            <Save />
            Save
          </DropdownMenuItem>
          {onReview && (
            <DropdownMenuItem onSelect={onReview}>
              <ListChecks />
              Review changes
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={onDiscard}
            className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/30"
          >
            <Trash2 />
            Discard changes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
