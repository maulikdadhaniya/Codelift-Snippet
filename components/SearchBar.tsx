"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, onSearch]);

  return (
    <div className="relative w-full max-w-xl mx-auto shadow-sm group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
        <Search size={20} />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl leading-5 bg-white dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all sm:text-sm"
        placeholder="Search notes by title or content..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <button
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => setQuery("")}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
