import { useEffect, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic } from 'lucide-react';

interface RichTextEditorProps {
  id?: string;
  value: string;
  // HTML (only p, br, strong, em), or '' when empty
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

// Short formatted text for labels: bold, italic and line breaks only (Shift+Enter for a line break)
export function RichTextEditor({ id, value, onChange, placeholder, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false, blockquote: false,
        code: false, codeBlock: false, horizontalRule: false, strike: false,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id: id ?? '',
        'aria-label': ariaLabel ?? '',
        'aria-multiline': 'true',
        role: 'textbox',
        class: 'min-h-[3.5rem] px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none [&_p]:min-h-[1.25rem]',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // Keep in step when the value is replaced from outside (e.g. a different product)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== (editor.isEmpty ? '' : editor.getHTML())) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  const empty = !editor || editor.isEmpty;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-sky-500">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-gray-100 dark:border-gray-700/60">
        <ToolbarButton label="Bold" active={!!editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={!!editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <span className="ml-auto pr-1.5 text-[11px] text-gray-400 dark:text-gray-500">Shift+Enter for a line break</span>
      </div>
      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-gray-400">{placeholder}</span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({ label, active, onClick, children }: {
  label: string; active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
