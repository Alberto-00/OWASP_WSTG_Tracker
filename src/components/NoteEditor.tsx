import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { Quote, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  testId: string;
}

// Colori evidenziatore (hex solido = identità nel menu). Applicati come tinta translucida.
const HIGHLIGHT_COLORS = [
  { value: '#d97706', label: 'Ambra' },
  { value: '#ea580c', label: 'Arancione' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#7c3aed', label: 'Viola' },
  { value: '#2563eb', label: 'Blu' },
  { value: '#059669', label: 'Verde' },
] as const;

// Alpha applicato all'evidenziazione: tinta leggibile su sfondo scuro, marks nidificati restano leggibili.
const HIGHLIGHT_ALPHA = '80';

const btnBase = 'h-8 w-8 p-0 text-sm hover:bg-primary/20';
const btnActive = 'bg-primary/30 border-primary';

const MenuBar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
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

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
      {/* Marks combinabili */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'font-black', state.isBold && btnActive)}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Grassetto (Ctrl+B)"
        >
          B
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'italic font-semibold', state.isItalic && btnActive)}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Corsivo (Ctrl+I)"
        >
          I
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'underline decoration-2', state.isUnderline && btnActive)}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sottolineato (Ctrl+U)"
        >
          U
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'line-through', state.isStrike && btnActive)}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Barrato"
        >
          S
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'font-mono text-xs', state.isCode && btnActive)}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Codice inline"
        >
          {'</>'}
        </Button>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Blocco (esclusivo) */}
      <Select value={state.block} onValueChange={setBlock}>
        <SelectTrigger className="h-8 w-36 text-xs bg-secondary/50">
          <SelectValue placeholder="Blocco" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p" className="text-xs">Paragrafo</SelectItem>
          <SelectItem value="h1" className="text-base font-bold">H1 - Titolo 1</SelectItem>
          <SelectItem value="h2" className="text-sm font-semibold">H2 - Titolo 2</SelectItem>
          <SelectItem value="h3" className="text-xs font-semibold">H3 - Titolo 3</SelectItem>
          <SelectItem value="bullet" className="text-xs">
            <span className="flex items-center gap-2">&bull; Lista puntata</span>
          </SelectItem>
          <SelectItem value="ordered" className="text-xs">
            <span className="flex items-center gap-2">1. Lista numerata</span>
          </SelectItem>
          <SelectItem value="codeblock" className="text-xs font-mono">
            <span className="flex items-center gap-2">{'{ }'} Blocco codice</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Evidenziazione */}
      <Select value={state.highlight} onValueChange={setHighlight}>
        <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
          <SelectValue placeholder="Evidenzia" />
        </SelectTrigger>
        <SelectContent>
          {HIGHLIGHT_COLORS.map((c) => (
            <SelectItem key={c.value} value={c.value} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                {c.label}
              </div>
            </SelectItem>
          ))}
          <SelectItem value="none" className="text-xs">Rimuovi</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Azioni */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, state.isBlockquote && btnActive)}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citazione"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(btnBase, 'hover:bg-primary/20')}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Linea orizzontale"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Rimuovi formattazione"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

export const NoteEditor = ({ content, onChange, testId }: NoteEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'code-inline',
          },
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: 'Scrivi le tue note qui...',
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'note-editor-content outline-none min-h-[300px] max-h-[400px] overflow-y-auto p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Aggiorna il contenuto quando cambia il test selezionato
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content || '');
    }
  }, [testId, content, editor]);

  // Gestione Escape per uscire dal code block
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && editor?.isActive('codeBlock')) {
      editor.chain().focus().exitCode().run();
    }
  }, [editor]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="space-y-2">
      <MenuBar editor={editor} />

      <div className="rounded-lg border-2 border-border bg-secondary/30 focus-within:border-primary transition-colors">
        <EditorContent editor={editor} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 px-1">
        <span>
          Blocco codice: premi{' '}
          <kbd className="px-1 py-0.5 bg-secondary/50 rounded text-[9px]">Esc</kbd> o{' '}
          <kbd className="px-1 py-0.5 bg-secondary/50 rounded text-[9px]">Ctrl+Enter</kbd> per uscire
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-secondary/50 rounded text-[9px]">Ctrl+B</kbd> Grassetto |{' '}
          <kbd className="px-1 py-0.5 bg-secondary/50 rounded text-[9px]">Ctrl+I</kbd> Corsivo |{' '}
          <kbd className="px-1 py-0.5 bg-secondary/50 rounded text-[9px]">Ctrl+U</kbd> Sottolineato
        </span>
      </div>
    </div>
  );
};
