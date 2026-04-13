"use client";

import { useState, useEffect, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import NoteCard from "@/components/NoteCard";
import NoteForm from "@/components/NoteForm";
import { Plus } from "lucide-react";
import { INote } from "@/models/Note";
import toast from "react-hot-toast";

export default function Home() {
  const [notes, setNotes] = useState<INote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<INote | null>(null);

  const fetchNotes = useCallback(async (query: string = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/notes?search=${encodeURIComponent(query)}` : "/api/notes";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNotes(data.data);
      }
    } catch (error) {
      toast.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes(searchQuery);
  }, [searchQuery, fetchNotes]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this snippet?")) return;
    
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Snippet deleted successfully");
        fetchNotes(searchQuery);
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      toast.error("Failed to delete snippet");
    }
  };

  const handleEdit = (note: INote) => {
    setEditingNote(note);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingNote(null);
    fetchNotes(searchQuery);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col items-center text-center space-y-4 mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Elevate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Code Snippets</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          Capture, Organize, and Elevate your most useful pieces of code. Keep everything accessible and syntactically flawless.
        </p>
      </div>

      <div className="flex justify-center w-full mb-12">
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {notes.map(note => (
            <NoteCard 
              key={String(note._id)} 
              note={note} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No snippets found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery ? "Try adjusting your search criteria." : "Get started by creating your first code snippet."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-opacity-90 transition-all shadow-lg hover:shadow-primary/30"
            >
              <Plus size={20} />
              Add Snippet
            </button>
          )}
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-primary text-white rounded-full shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 transition-all group z-40"
        aria-label="Add new snippet"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Form Modal */}
      {isFormOpen && (
        <NoteForm 
          initialData={editingNote}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
