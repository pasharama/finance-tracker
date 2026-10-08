"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Wallet, Edit2, SlidersHorizontal, Trash2, Check, X, AlertCircle } from "lucide-react";
import { CurrencyEngine } from "@/features/currency/currency-engine";

export default function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Tambah Dompet
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState("BANK");
  const [addBalance, setAddBalance] = useState("0");

  // Modal Edit Dompet / Sesuaikan Saldo
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editReason, setEditReason] = useState("");

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName) return;

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          type: addType,
          initialBalance: parseFloat(addBalance) || 0,
          currency: "JPY",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAddName("");
        setAddBalance("0");
        setIsAddOpen(false);
        showNotice("success", "Dompet baru berhasil ditambahkan!");
        loadAccounts();
      } else {
        showNotice("error", data.error || "Gagal menambah dompet");
      }
    } catch (e) {
      showNotice("error", "Terjadi kesalahan jaringan");
    }
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditType(acc.type);
    setEditBalance(String(acc.currentBalance));
    setEditReason("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const res = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          type: editType,
          newBalance: parseFloat(editBalance),
          reason: editReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingAccount(null);
        showNotice("success", "Dompet dan saldo berhasil disesuaikan!");
        loadAccounts();
      } else {
        showNotice("error", data.error || "Gagal memperbarui dompet");
      }
    } catch (e) {
      showNotice("error", "Terjadi kesalahan jaringan");
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    if (!confirm(`Hapus dompet "${acc.name}"?`)) return;

    try {
      const res = await fetch(`/api/accounts/${acc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showNotice("success", "Dompet berhasil dihapus");
        loadAccounts();
      } else {
        showNotice("error", data.error || "Gagal menghapus dompet");
      }
    } catch (e) {
      showNotice("error", "Terjadi kesalahan");
    }
  };

  const totalAllBalances = accounts.reduce((a, b) => a + Number(b.currentBalance), 0);

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <div className="max-w-md mx-auto w-full p-4 pt-6 flex items-center justify-between border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold">Dashboard</span>
        </Link>
        <h1 className="text-sm font-bold text-white">Kelola Wallets & Akun</h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="p-2 -mr-2 rounded-xl text-emerald-400 hover:text-white hover:bg-neutral-900 transition flex items-center gap-1"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        {/* Banner Total */}
        <div className="p-5 rounded-3xl bg-neutral-900/60 border border-neutral-800 flex justify-between items-center">
          <div>
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Total Kas Semua Dompet</p>
            <h2 className="text-2xl font-black text-white mt-0.5">{CurrencyEngine.formatJPY(totalAllBalances)}</h2>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Tambah
          </button>
        </div>

        {notification && (
          <div
            className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-medium ${
              notification.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
            }`}
          >
            {notification.type === "success" ? <Check className="w-4 h-4 stroke-[2.5]" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* List Dompet */}
        <div className="space-y-2.5">
          {isLoading ? (
            <p className="text-xs text-neutral-500 text-center py-8">Memuat dompet...</p>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex justify-between items-center hover:border-neutral-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-neutral-800 text-neutral-300">
                      {acc.type}
                    </span>
                    <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                  </div>
                  <p className="text-xs font-semibold text-emerald-400 mt-1.5">
                    {CurrencyEngine.formatJPY(Number(acc.currentBalance))}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {acc._count?.sourceTransactions + acc._count?.destinationTransactions || 0} riwayat transaksi
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(acc)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                    title="Edit Dompet & Sesuaikan Saldo"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Hapus Dompet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Tambah Dompet */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Tambah Dompet Baru</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nama Dompet / Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Chiba Bank, PayPay, Suica, Cash JPY"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tipe Akun</label>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="BANK">Bank Account (Chiba/SMBC/Yucho)</option>
                  <option value="E_WALLET">E-Wallet (PayPay/LinePay)</option>
                  <option value="IC_CARD">IC Card (Suica/Pasmo)</option>
                  <option value="CASH">Cash Fisik</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Saldo Awal (¥ JPY)</label>
                <input
                  type="number"
                  value={addBalance}
                  onChange={(e) => setAddBalance(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white outline-none focus:border-white"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-white text-black text-xs font-bold"
                >
                  Tambah Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit & Sesuaikan Saldo */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Kelola & Sesuaikan Saldo</h3>
              <button onClick={() => setEditingAccount(null)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nama Dompet</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tipe Akun</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="E_WALLET">E-Wallet</option>
                  <option value="IC_CARD">IC Card</option>
                  <option value="CASH">Cash Fisik</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-emerald-400 block">Koreksi Saldo Riil (¥ JPY)</label>
                  <span className="text-[10px] text-neutral-500">Saldo tercatat: ¥{Number(editingAccount.currentBalance).toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  required
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-white outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Alasan koreksi (cth: selisih kembalian, lupa catat)"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-[11px] text-white outline-none placeholder:text-neutral-600"
                />
                <p className="text-[9px] text-neutral-500">
                  Selisih saldo akan otomatis dicatat ke riwayat transaksi sebagai rekam jejak keuangan.
                </p>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-white text-black text-xs font-bold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}