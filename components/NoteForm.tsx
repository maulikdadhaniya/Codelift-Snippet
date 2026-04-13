"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Save, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { INote } from "@/models/Note";
import toast from "react-hot-toast";

interface NoteFormProps {
  initialData?: INote | null;
  onClose: () => void;
  onSuccess: () => void;
}

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "cpp",
  "html",
  "css",
  "json",
  "markdown",
  "go",
  "rust",
  "sql",
  "kotlin",
  "diff"
];

export default function NoteForm({ initialData, onClose, onSuccess }: NoteFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [language, setLanguage] = useState(initialData?.language || "javascript");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { resolvedTheme } = useTheme();

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) {
      toast.error("Title and code are required.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        title,
        code,
        language,
        tags: tags.split(",").map(t => t.trim()).filter(t => t)
      };

      const url = initialData ? `/api/notes/${initialData._id}` : "/api/notes";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(initialData ? "Note updated!" : "Note created!");
        onSuccess();
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch (error) {
      toast.error("Failed to save note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-primary">
            <Command size={20} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {initialData ? "Edit Snippet" : "New Snippet"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <form id="note-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  type="text"
                  placeholder="e.g. JWT Auth Middleware"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="react, hooks, performance"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="space-y-2 flex-1 min-h-[500px]">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Code Snippet</label>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-[500px]">
                <Editor
                  height="100%"
                  language={language}
                  theme={resolvedTheme === "light" ? "light" : "vs-dark"}
                  value={code}
                  onChange={(val) => setCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    roundedSelection: true,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="note-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl font-medium bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            <Save size={18} />
            {isSubmitting ? "Saving..." : "Save Snippet"}
          </button>
        </div>

      </div>
    </div>
  );
}
