import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  testId: string;
}

const MenuBar = ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
  if (!editor) return null;

  const setHeading = (level: string) => {
    if (level === 'p') {
      editor.chain().focus().setParagraph().run();
    } else {
      const headingLevel = parseInt(level.replace('h', '')) as 1 | 2 | 3;
      editor.chain().focus().toggleHeading({ level: headingLevel }).run();
    }
  };

  const setHighlight = (color: string) => {
    if (color === 'none') {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-card/50 rounded-lg border border-border/50">
      {/* Testo base */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-sm font-black hover:bg-primary/20",
            editor.isActive('bold') && "bg-primary/30 border-primary"
          )}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Grassetto (Ctrl+B)"
        >
          B
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-sm italic font-semibold hover:bg-primary/20",
            editor.isActive('italic') && "bg-primary/30 border-primary"
          )}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Corsivo (Ctrl+I)"
        >
          I
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-sm underline decoration-2 hover:bg-primary/20",
            editor.isActive('underline') && "bg-primary/30 border-primary"
          )}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sottolineato (Ctrl+U)"
        >
          U
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-sm line-through hover:bg-primary/20",
            editor.isActive('strike') && "bg-primary/30 border-primary"
          )}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Barrato"
        >
          S
        </Button>
      </div>

      <div className="w-px h-8 bg-border" />

      {/* Headers */}
      <Select onValueChange={setHeading}>
        <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
          <SelectValue placeholder="Formato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p" className="text-xs">Paragrafo</SelectItem>
          <SelectItem value="h1" className="text-base font-bold">H1 - Titolo 1</SelectItem>
          <SelectItem value="h2" className="text-sm font-semibold">H2 - Titolo 2</SelectItem>
          <SelectItem value="h3" className="text-xs font-semibold">H3 - Titolo 3</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Liste e Codice - Select */}
      <Select
        onValueChange={(value) => {
          switch (value) {
            case 'bullet':
              editor.chain().focus().toggleBulletList().run();
              break;
            case 'ordered':
              editor.chain().focus().toggleOrderedList().run();
              break;
            case 'code':
              editor.chain().focus().toggleCode().run();
              break;
            case 'codeblock':
              editor.chain().focus().toggleCodeBlock().run();
              break;
          }
        }}
      >
        <SelectTrigger className="h-8 w-36 text-xs bg-secondary/50">
          <SelectValue placeholder="Liste / Codice" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bullet" className="text-xs">
            <span className="flex items-center gap-2">&bull; Lista puntata</span>
          </SelectItem>
          <SelectItem value="ordered" className="text-xs">
            <span className="flex items-center gap-2">1. Lista numerata</span>
          </SelectItem>
          <SelectItem value="code" className="text-xs font-mono">
            <span className="flex items-center gap-2">&lt;/&gt; Codice inline</span>
          </SelectItem>
          <SelectItem value="codeblock" className="text-xs font-mono">
            <span className="flex items-center gap-2">{"{ }"} Blocco codice</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Citazione e Linea - Select */}
      <Select
        onValueChange={(value) => {
          switch (value) {
            case 'quote':
              editor.chain().focus().toggleBlockquote().run();
              break;
            case 'hr':
              editor.chain().focus().setHorizontalRule().run();
              break;
          }
        }}
      >
        <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
          <SelectValue placeholder="Inserisci" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="quote" className="text-xs">
            <span className="flex items-center gap-2">&ldquo; &rdquo; Citazione</span>
          </SelectItem>
          <SelectItem value="hr" className="text-xs">
            <span className="flex items-center gap-2">&#8212; Linea</span>
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Evidenziazione */}
      <Select onValueChange={setHighlight}>
        <SelectTrigger className="h-8 w-32 text-xs bg-secondary/50">
          <SelectValue placeholder="Evidenzia" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="#d97706" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#d97706'}}></span>
              Ambra
            </div>
          </SelectItem>
          <SelectItem value="#ea580c" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#ea580c'}}></span>
              Arancione
            </div>
          </SelectItem>
          <SelectItem value="#db2777" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#db2777'}}></span>
              Rosa
            </div>
          </SelectItem>
          <SelectItem value="#7c3aed" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#7c3aed'}}></span>
              Viola
            </div>
          </SelectItem>
          <SelectItem value="#2563eb" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#2563eb'}}></span>
              Blu
            </div>
          </SelectItem>
          <SelectItem value="#059669" className="text-xs">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{backgroundColor: '#059669'}}></span>
              Verde
            </div>
          </SelectItem>
          <SelectItem value="none" className="text-xs">Rimuovi</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-border" />

      {/* Clear */}
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
