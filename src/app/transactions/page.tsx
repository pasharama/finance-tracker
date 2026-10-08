"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Trash2, Edit2, CheckSquare, Square, X, ChevronLeft, ChevronRight } from "lucide-react";
import { CurrencyEngine } from "@/features/currency/currency-engine";
import { getSalaryCycle } from "@/lib/cycle";

export default function TransactionsHistoryPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [salaryDay, setSalaryDay] = useState(10);
  const [cycleOffset, setCycleOffset] = useState(0);
  const [cycleLabel, setCycleLabel] = useState("");

  // Bulk Select Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editWallet, setEditWallet] = useState("");
  const [editDate, setEditDate] = useState("");

  const loadData = async () => {
    try {
      const [accRes, txRes, profRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/transactions"),
        fetch("/api/profile"),
      ]);

      if (profRes.ok) {
        const prof = await profRes.json();
        if (prof.salaryDate !== undefined) setSalaryDay(prof.salaryDate);
      }

      if (accRes.ok) setAccounts(await accRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const cycle = getSalaryCycle(new Date(), salaryDay, cycleOffset);
    setCycleLabel(cycle.label);
  }, [salaryDay, cycleOffset]);

  const currentCycle = getSalaryCycle(new Date(), salaryDay, cycleOffset);

  // Filter berdasarkan periode siklus & pencarian nama
  const filteredTransactions = transactions.filter((tx) => {
    const d = new Date(tx.date);
    const inCycle = d >= currentCycle.startDate && d <= currentCycle.endDate;
    const matchSearch = (tx.merchant || "").toLowerCase().includes(searchQuery.toLowerCase());
    return inCycle && matchSearch;
  });

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus transaksi ini? Saldo dompet akan di-rollback secara otomatis.")) return;

    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedTxIds((prev) => prev.filter((item) => item !== id));
      loadData();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTxIds.length === 0) return;
    if (!confirm(`Hapus ${selectedTxIds.length} transaksi yang dipilih? Seluruh saldo terkait akan di-rollback.`)) return;

    const res = await fetch("/api/transactions/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedTxIds }),
    });

    if (res.ok) {
      setSelectedTxIds([]);
      setIsSelectionMode(false);
      loadData();
    }
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTxIds.length === filteredTransactions.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map((tx) => tx.id));
    }
  };

  const openEditModal = (tx: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTx(tx);
    setEditAmount(String(tx.total));
    setEditMerchant(tx.merchant || "");
    setEditWallet(tx.sourceAccountId || (accounts[0]?.id || ""));
    setEditDate(tx.date ? tx.date.split("T")[0] : new Date().toISOString().split("T")[0]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editAmount) return;

    const res = await fetch(`/api/transactions/${editingTx.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parseFloat(editAmount),
        merchant: editMerchant,
        sourceAccountId: editWallet,
        date: editDate,
      }),
    });

    if (res.ok) {
      setEditingTx(null);
      loadData();
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans pb-24">
      {/* Top Navbar */}
      <div className="max-w-md mx-auto w-full p-4 pt-6 flex items-center justify-between border-b border-neutral-900 sticky top-0 bg-black/80 backdrop-blur-md z-20">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold">Dashboard</span>
        </Link>
        <h1 className="text-sm font-bold text-white">Riwayat Transaksi</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-md mx-auto w-full px-4 pt-4 space-y-4">
        {/* Selector Siklus Gaji */}
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
          <button
            onClick={() => setCycleOffset((p) => p - 1)}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
              {cycleOffset === 0 ? "Siklus Berjalan" : "Siklus Sebelumnya"}
            </span>
            <span className="text-xs font-bold text-white">{cycleLabel}</span>
          </div>
          <button
            disabled={cycleOffset >= 0}
            onClick={() => setCycleOffset((p) => p + 1)}
            className={`p-1.5 rounded-lg bg-neutral-800 text-neutral-300 ${cycleOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:text-white"}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Bulk Select Trigger */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari transaksi / merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-neutral-600 transition"
            />
          </div>
          {isSelectionMode ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-2 rounded-xl bg-neutral-800 text-sky-400 text-xs font-semibold"
              >
                {selectedTxIds.length === filteredTransactions.length ? "Batal" : "Semua"}
              </button>
              <button
                onClick={() => { setIsSelectionMode(false); setSelectedTxIds([]); }}
                className="p-2.5 rounded-xl bg-neutral-800 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSelectionMode(true)}
              className="px-3.5 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white"
            >
              Pilih Banyak
            </button>
          )}
        </div>

        {/* List Transaksi */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
              Tidak ada transaksi ditemukan pada siklus ini.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isIncome = tx.type === "INCOME";
              const isTransfer = tx.type === "TRANSFER";
              const isSelected = selectedTxIds.includes(tx.id);

              return (
                <div
                  key={tx.id}
                  onClick={() => isSelectionMode && toggleSelectTx(tx.id)}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                    isSelected
                      ? "bg-rose-950/20 border-rose-500/50"
                      : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  } ${isSelectionMode ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {isSelectionMode && (
                      <div className="text-neutral-400">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-rose-500" /> : <Square className="w-4 h-4 text-neutral-600" />}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            isTransfer
                              ? "bg-sky-500/20 text-sky-400"
                              : isIncome
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {isTransfer ? "⇄ Transfer" : isIncome ? "入 Income" : "出 Expense"}
                        </span>
                        <p className="text-xs font-semibold text-white">{tx.merchant || "Transaksi"}</p>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">{tx.date?.split("T")[0]} • {tx.sourceAccount?.name || "Wallet"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xs font-bold ${isTransfer ? "text-neutral-300" : isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                        {isTransfer ? "±" : isIncome ? "+" : "-"}{CurrencyEngine.formatJPY(Number(tx.total))}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        ≈ {CurrencyEngine.formatIDR(Number(tx.convertedAmount))}
                      </p>
                    </div>

                    {!isSelectionMode && (
                      <div className="flex items-center gap-1 border-l border-neutral-800 pl-2">
                        <button
                          onClick={(e) => openEditModal(tx, e)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSingle(tx.id, e)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bulk Delete Floating Bar */}
      {isSelectionMode && selectedTxIds.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 max-w-md mx-auto">
          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl flex items-center justify-between backdrop-blur-lg">
            <span className="text-xs font-semibold text-white">{selectedTxIds.length} dipilih</span>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Trash2 className="w-4 h-4" /> Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Modal Edit Transaksi */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Edit Transaksi</h3>
              <button onClick={() => setEditingTx(null)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nominal (¥ JPY)</label>
                <input
                  type="number"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-lg font-bold text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nama Toko / Keterangan</label>
                <input
                  type="text"
                  required
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Wallet Sumber</label>
                <select
                  value={editWallet}
                  onChange={(e) => setEditWallet(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-white text-black text-xs font-bold"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}