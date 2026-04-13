"use client";

import { INote } from "@/models/Note";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Edit2, Trash2, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface NoteCardProps {
  note: INote;
  onEdit: (note: INote) => void;
  onDelete: (id: string) => void;
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    navigator.clipboard.writeText(note.code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={() => router.push(`/notes/${String(note._id)}`)}
      className="cursor-pointer group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full hover:border-primary/30"
    >
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start gap-4">
        <div>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 line-clamp-1">
            {note.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md">
              {note.language}
            </span>
            {note.tags && note.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
            className="p-1.5 text-gray-400 hover:text-secondary rounded-lg hover:bg-secondary/10 transition-colors"
            title="Edit note"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(String(note._id)); }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-[#1E1E1E] group/code m-4 rounded-xl overflow-hidden">
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg opacity-0 group-hover/code:opacity-100 transition-all z-10"
          title="Copy code"
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
        <SyntaxHighlighter
          language={note.language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            background: 'transparent',
            height: '100%',
            maxHeight: '500px',
            overflowY: 'auto',
            overflowX: 'auto',
            fontSize: '0.875rem',
          }}
          wrapLines={true}
        >
          {note.code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
