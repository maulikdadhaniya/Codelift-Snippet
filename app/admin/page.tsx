"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, RefreshCw, Ban, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";

type AdminUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  role: "user" | "admin";
  isRevoked: boolean;
  noteCount: number;
  createdAt: string;
};

type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  revokedUsers: number;
  totalNotes: number;
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to load users");
        return;
      }
      setUsers(data.users);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      loadUsers();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user?.role, loadUsers]);

  const revoke = async (id: string) => {
    if (!window.confirm("Revoke this user's access? They will not be able to sign in or use the app.")) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/revoke`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to revoke");
        return;
      }
      toast.success(data.message || "Access revoked");
      await loadUsers();
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setActionId(null);
    }
  };

  const restore = async (id: string) => {
    setActionId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/restore`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to restore");
        return;
      }
      toast.success(data.message || "Access restored");
      await loadUsers();
    } catch {
      toast.error("Failed to restore");
    } finally {
      setActionId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <p className="text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        <Link href="/" className="text-primary font-medium hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary dark:text-gray-400 mb-3"
          >
            <ArrowLeft size={16} />
            Back to snippets
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-primary" size={28} />
            Admin panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View all users, note counts, and revoke or restore access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total users", value: stats.totalUsers },
            { label: "Active", value: stats.activeUsers },
            { label: "Revoked", value: stats.revokedUsers },
            { label: "Total notes", value: stats.totalNotes },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-center">Notes</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.mobile || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{u.noteCount}</td>
                    <td className="px-4 py-3">
                      {u.isRevoked ? (
                        <span className="text-red-600 dark:text-red-400 text-xs font-medium">Revoked</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {u.role === "admin" ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : u.isRevoked ? (
                        <button
                          type="button"
                          disabled={actionId === u.id}
                          onClick={() => restore(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/10 text-green-700 dark:text-green-400 hover:bg-green-600/20 disabled:opacity-50"
                        >
                          <UserCheck size={14} />
                          Restore
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionId === u.id}
                          onClick={() => revoke(u.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/10 text-red-700 dark:text-red-400 hover:bg-red-600/20 disabled:opacity-50"
                        >
                          <Ban size={14} />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
