"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { INote } from "@/models/Note";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ArrowLeft, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<INote | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchNote() {
      try {
        const res = await fetch(`/api/notes/${params.id}`);
        const data = await res.json();
        if (data.success) {
          setNote(data.data);
        } else {
          toast.error(data.error || "Snippet not found");
          router.push("/");
        }
      } catch (e) {
        toast.error("Failed to fetch snippet");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchNote();
    }
  }, [params.id, router]);

  const handleCopy = () => {
    if (!note) return;
    navigator.clipboard.writeText(note.code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Snippets
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {note.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-mono px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700">
                {note.language}
              </span>
              {note.tags && note.tags.map(tag => (
                <span key={tag} className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-lg">
                  #{tag}
                </span>
              ))}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Added {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-medium transition-colors sm:absolute sm:top-8 sm:right-8"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy Code"}
          </button>
        </div>

        <div className="bg-[#1E1E1E] p-6 lg:p-8 min-h-[500px] overflow-hidden">
          <SyntaxHighlighter
            language={note.language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: 0,
              background: 'transparent',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              overflowX: 'auto',
            }}
            wrapLines={true}
          >
            {note.code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
