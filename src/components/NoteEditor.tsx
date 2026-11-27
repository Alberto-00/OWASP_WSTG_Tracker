import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { common, createLowlight } from 'lowlight';
import http from 'highlight.js/lib/languages/http';
import { useEffect, useRef } from 'react';
import { Quote, Minus, RemoveFormatting } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  testId: string;
}

// Colori evidenziatore (hex solido = identità nel menu). Applicati come tinta translucida.
const HIGHLIGHT_COLORS = [
  { value: '#d97706', label: 'amber' },
  { value: '#ea580c', label: 'orange' },
  { value: '#db2777', label: 'pink' },
  { value: '#7c3aed', label: 'purple' },
  { value: '#2563eb', label: 'blue' },
  { value: '#059669', label: 'green' },
] as const;

// Alpha applicato all'evidenziazione: tinta leggibile su sfondo scuro, marks nidificati restano leggibili.
const HIGHLIGHT_ALPHA = '80';

// Sintassi colorata nei blocchi di codice: linguaggi comuni più HTTP, per richieste e risposte
const lowlight = createLowlight(common);
lowlight.register({ http });
// Linguaggi proposti quando il cursore è in un blocco di codice ('auto' = riconoscimento automatico)
const CODE_LANGUAGES = [
  ['auto', ''],
  ['http', 'HTTP'],
  ['bash', 'Bash'],
  ['javascript', 'JavaScript'],
  ['json', 'JSON'],
  ['xml', 'HTML / XML'],
  ['sql', 'SQL'],
  ['python', 'Python'],
  ['php', 'PHP'],
  ['plaintext', ''],
] as const;

// Ctrl+Shift+S è "Salva con nome": va tolto al barrato di TipTap (resta il pulsante in toolbar).
const ReserveAppShortcuts = Extension.create({
  name: 'reserveAppShortcuts',
  priority: 1000,
  addKeyboardShortcuts() {
    return { 'Mod-Shift-s': () => true };
  },
});

const btnBase = 'h-7 w-7 p-0 text-sm hover:bg-primary/20';
const btnActive = 'bg-primary/30 border-primary';

const MenuBar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  const { t } = useLanguage();
  // Snapshot reattivo: si aggiorna anche al solo spostamento del cursore (non solo a modifica testo).
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;

      let block = 'p';
      if (e.isActive('heading', { level: 1 })) block = 'h1';
      else if (e.isActive('heading', { level: 2 })) block = 'h2';
      else if (e.isActive('heading', { level: 3 })) block = 'h3';
      else if (e.isActive('bulletList')) block = 'bullet';
      else if (e.isActive('orderedList')) block = 'ordered';
      else if (e.isActive('taskList')) block = 'task';
      else if (e.isActive('codeBlock')) block = 'codeblock';

      const rawColor = (e.getAttributes('highlight').color as string | undefined)?.toLowerCase();
      const highlight = rawColor
        ? HIGHLIGHT_COLORS.find((c) => rawColor.startsWith(c.value))?.value ?? ''
        : '';

      return {
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isCode: e.isActive('code'),
        isBlockquote: e.isActive('blockquote'),
        block,
        highlight,
        codeLanguage: (e.getAttributes('codeBlock').language as string | null) || 'auto',
      };
    },
  });

  if (!editor || !state) return null;

  // Blocco esclusivo: clearNodes() normalizza il nodo corrente prima di applicare il nuovo tipo,
  // così ogni passaggio (lista -> heading, codeblock -> lista, ecc.) è pulito e prevedibile.
  const setBlock = (value: string) => {
    const chain = editor.chain().focus().clearNodes();
    switch (value) {
      case 'p':
        chain.run();
        break;
      case 'h1':
        chain.toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        chain.toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        chain.toggleBulletList().run();
        break;
      case 'ordered':
        chain.toggleOrderedList().run();
        break;
      case 'task':
        chain.toggleTaskList().run();
        break;
      case 'codeblock':
        chain.setCodeBlock().run();
        break;
    }
  };

  const setHighlight = (color: string) => {
    if (color === 'none') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().setHighlight({ color: color + HIGHLIGHT_ALPHA }).run();
    }
  };

  const markButton = (label: string, active: boolean, onClick: () => void, className: string, glyph: string) => (
    <Button
      variant="outline"
      size="sm"
      className={cn(btnBase, className, active && btnActive)}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {glyph}
    </Button>
  );

  return (
    // Gruppi separati dallo spazio (non da divisori): se la barra va a capo non restano separatori orfani
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-1.5 bg-card/50 rounded-lg border border-border/50" role="toolbar" aria-label={t('notes')}>
      {/* Marks combinabili */}
      <div className="flex gap-1">
        {markButton(`${t('bold')} (Ctrl+B)`, state.isBold, () => editor.chain().focus().toggleBold().run(), 'font-black', 'B')}
        {markButton(`${t('italic')} (Ctrl+I)`, state.isItalic, () => editor.chain().focus().toggleItalic().run(), 'italic font-semibold', 'I')}
        {markButton(`${t('underline')} (Ctrl+U)`, state.isUnderline, () => editor.chain().focus().toggleUnderline().run(), 'underline decoration-2', 'U')}
        {markButton(t('strike'), state.isStrike, () => editor.chain().focus().toggleStrike().run(), 'line-through', 'S')}
        {markButton(`${t('inlineCode')} (Ctrl+E)`, state.isCode, () => editor.chain().focus().toggleCode().run(), 'font-mono text-xs', '</>')}
      </div>

      {/* Blocco (esclusivo) */}
      <Select value={state.block} onValueChange={setBlock}>
        <SelectTrigger className="h-7 w-36 text-xs bg-secondary/50" aria-label={t('blockType')}>
          <SelectValue placeholder={t('blockType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p" className="text-xs">{t('paragraph')}</SelectItem>
          <SelectItem value="h1" className="text-base font-bold">{t('heading1')}</SelectItem>
          <SelectItem value="h2" className="text-sm font-semibold">{t('heading2')}</SelectItem>
          <SelectItem value="h3" className="text-xs font-semibold">{t('heading3')}</SelectItem>
          <SelectItem value="bullet" className="text-xs">&bull; {t('bulletList')}</SelectItem>
          <SelectItem value="ordered" className="text-xs">1. {t('orderedList')}</SelectItem>
          <SelectItem value="task" className="text-xs">&#9745; {t('taskList')}</SelectItem>
          <SelectItem value="codeblock" className="text-xs font-mono">{'{ }'} {t('codeBlock')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Linguaggio del blocco di codice in cui si trova il cursore */}
      {state.block === 'codeblock' && (
        <Select
          value={state.codeLanguage}
          onValueChange={(v) => editor.chain().focus().updateAttributes('codeBlock', { language: v === 'auto' ? null : v }).run()}
        >
          <SelectTrigger className="h-7 w-32 text-xs bg-secondary/50" aria-label={t('codeLanguage')} title={t('codeLanguage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CODE_LANGUAGES.map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {value === 'auto' ? t('autoDetect') : value === 'plaintext' ? t('plainText') : label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Evidenziazione */}
      <Select value={state.highlight} onValueChange={setHighlight}>
        <SelectTrigger className="h-7 w-28 text-xs bg-secondary/50" aria-label={t('highlight')}>
          <SelectValue placeholder={t('highlight')} />
        </SelectTrigger>
        <SelectContent>
          {HIGHLIGHT_COLORS.map((c) => (
            <SelectItem key={c.value} value={c.value} className="text-xs">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                {t(c.label)}
              </span>
            </SelectItem>
          ))}
          <SelectItem value="none" className="text-xs">{t('removeHighlight')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Azioni */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, state.isBlockquote && btnActive)}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title={t('quote')}
          aria-label={t('quote')}
          aria-pressed={state.isBlockquote}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={btnBase}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title={t('divider')}
          aria-label={t('divider')}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'text-red-400 hover:text-red-300 hover:bg-red-500/10')}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title={t('clearFormatting')}
          aria-label={t('clearFormatting')}
        >
          <RemoveFormatting className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const NoteEditor = ({ content, onChange, testId }: NoteEditorProps) => {
  const { t } = useLanguage();
  // Le estensioni vengono create una volta sola: il placeholder legge la lingua corrente da un ref
  const placeholder = useRef('');
  placeholder.current = t('notesPlaceholder');
  const editor = useEditor({
    extensions: [
      ReserveAppShortcuts,
      StarterKit.configure({
        // Il paragrafo vuoto aggiunto in coda a note che finiscono con elenco/citazione/codice
        // risultava una modifica alla sola apertura della nota (e finiva nel file salvato)
        trailingNode: false,
        heading: {
          levels: [1, 2, 3],
        },
        // Sostituito da CodeBlockLowlight (stesso nodo, con la sintassi colorata)
        codeBlock: false,
        code: {
          HTMLAttributes: {
            class: 'code-inline',
          },
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: () => placeholder.current,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'note-editor-content outline-none min-h-full p-4',
        'aria-label': t('notes'),
      },
      // Esc esce dal blocco di codice (solo se il focus è nell'editor)
      handleKeyDown: (view, event) => {
        if (event.key === 'Escape' && editor?.isActive('codeBlock')) {
          editor.chain().focus().exitCode().run();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Suggerimento per uscire dal blocco di codice: solo quando il cursore è dentro
  const inCodeBlock = useEditorState({ editor, selector: (ctx) => !!ctx.editor?.isActive('codeBlock') });

  // Cambio test: carica la sua nota senza emettere update (aprire una nota non è una modifica)
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [testId, content, editor]);

  return (
    <div className="h-full flex flex-col gap-2 p-4">
      <MenuBar editor={editor} />

      <div
        className="flex-1 min-h-0 overflow-y-auto rounded-lg border-2 border-border bg-secondary/30 focus-within:border-primary transition-colors cursor-text"
        onClick={(e) => e.target === e.currentTarget && editor?.commands.focus('end')}
      >
        <EditorContent editor={editor} className="h-full" />
      </div>
      {inCodeBlock && <p className="text-[11px] text-muted-foreground px-1 animate-fade-in">{t('codeBlockHint')}</p>}
    </div>
  );
};
