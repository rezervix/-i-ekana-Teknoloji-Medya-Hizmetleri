"use client";

import React, { useState, useEffect } from "react";
import { 
  Users2, Mail, Plus, Edit, Trash2, Shield, ToggleLeft, ToggleRight, 
  Search, Loader2, AlertCircle, CheckCircle2, X
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "EDITOR" as "SUPER_ADMIN" | "ADMIN" | "EDITOR",
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Kullanıcılar yüklenirken bir hata oluştu.");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kullanıcı eklenemedi.");
      }
      setSuccessMsg("Kullanıcı başarıyla eklendi.");
      setIsCreateOpen(false);
      setFormData({ name: "", email: "", password: "", role: "EDITOR" });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          ...(formData.password && { password: formData.password })
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kullanıcı güncellenemedi.");
      }
      setSuccessMsg("Kullanıcı başarıyla güncellendi.");
      setIsEditOpen(false);
      setSelectedUser(null);
      setFormData({ name: "", email: "", password: "", role: "EDITOR" });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Durum güncellenemedi.");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Kullanıcı silinemedi.");
      setSuccessMsg("Kullanıcı silindi.");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-corp-charcoal flex items-center gap-2">
            <Users2 className="text-corp-teal" /> Kullanıcı Yönetimi
          </h2>
          <p className="text-sm font-body text-corp-gray mt-1">
            Yönetim panelinde işlem yapabilecek kişileri, rollerini ve durumlarını yönetin.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", email: "", password: "", role: "EDITOR" });
            setIsCreateOpen(true);
          }}
          className="bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors shadow-sm text-sm"
        >
          <Plus size={16} /> Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-corp-border shadow-sm flex items-center gap-3">
        <Search className="text-corp-gray-light" size={18} />
        <input
          type="text"
          placeholder="Ad veya e-posta ile ara..."
          className="w-full font-body text-sm text-corp-charcoal placeholder-corp-gray-light outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-corp-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-corp-gray">
            <Loader2 className="animate-spin text-corp-teal mb-3" size={28} />
            <span>Kullanıcı listesi yükleniyor...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Kullanıcı</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Son Giriş</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4 text-right pr-6">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-corp-gray font-body">
                        Kullanıcı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-corp-surface/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-corp-charcoal text-sm">
                              {user.name || "İsim Belirtilmemiş"}
                            </span>
                            <span className="text-xs text-corp-gray flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} /> {user.email}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" :
                            user.role === "ADMIN" ? "bg-blue-100 text-blue-700" :
                            "bg-teal-50 text-corp-teal"
                          }`}>
                            <Shield size={12} />
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-corp-gray font-body">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleString("tr-TR") 
                            : "Giriş yapılmadı"}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="focus:outline-none transition-colors"
                          >
                            {user.isActive ? (
                              <ToggleRight className="text-corp-teal" size={32} />
                            ) : (
                              <ToggleLeft className="text-corp-gray-light" size={32} />
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setFormData({
                                  name: user.name || "",
                                  email: user.email,
                                  password: "",
                                  role: user.role,
                                });
                                setIsEditOpen(true);
                              }}
                              className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-corp-gray hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-corp-border">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-corp-gray font-body text-sm">
                  Kullanıcı bulunamadı.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-corp-charcoal text-base">
                          {user.name || "İsim Belirtilmemiş"}
                        </h4>
                        <span className="text-xs text-corp-gray flex items-center gap-1.5 mt-0.5">
                          <Mail size={12} /> {user.email}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                        user.role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" :
                        user.role === "ADMIN" ? "bg-blue-100 text-blue-700" :
                        "bg-teal-50 text-corp-teal"
                      }`}>
                        <Shield size={11} />
                        {user.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-corp-gray pt-1">
                      <span>Son Giriş: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("tr-TR") : "—"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]">{user.isActive ? "Aktif" : "Pasif"}</span>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          {user.isActive ? (
                            <ToggleRight className="text-corp-teal" size={32} />
                          ) : (
                            <ToggleLeft className="text-corp-gray-light" size={32} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-corp-border">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({
                            name: user.name || "",
                            email: user.email,
                            password: "",
                            role: user.role,
                          });
                          setIsEditOpen(true);
                        }}
                        className="min-h-[44px] px-3.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Edit size={14} /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="min-h-[44px] px-3 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Sil
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal - Create User */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-corp-border max-w-md w-full p-4 sm:p-6 space-y-4 shadow-luxury animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">Yeni Kullanıcı Ekle</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-corp-gray hover:text-corp-charcoal rounded-xl -mr-2"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">E-Posta</label>
                <input
                  type="email"
                  required
                  placeholder="ahmet@cicekana.com"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Şifre</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Rol</label>
                <select
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors font-semibold text-sm flex items-center justify-center"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="animate-spin" size={16} />} Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Edit User */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-corp-border max-w-md w-full p-4 sm:p-6 space-y-4 shadow-luxury animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">Kullanıcıyı Düzenle</h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditOpen(false);
                  setSelectedUser(null);
                }}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-corp-gray hover:text-corp-charcoal rounded-xl -mr-2"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-corp-gray font-body -mt-2">E-posta adresi ({selectedUser.email}) değiştirilemez.</p>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Şifre (Değiştirmek için doldurun)</label>
                <input
                  type="password"
                  placeholder="•••••••• (boş bırakılırsa değişmez)"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Rol</label>
                <select
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-base sm:text-sm outline-none focus:border-corp-teal transition-all min-h-[44px]"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedUser(null);
                  }}
                  className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors font-semibold text-sm flex items-center justify-center"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="min-h-[44px] flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="animate-spin" size={16} />} Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
