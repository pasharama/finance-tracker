"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, ArrowDownRight, RefreshCcw, Camera, ArrowUpRight, TrendingUp, ChevronLeft, ChevronRight, Upload, CheckCircle, User, Sliders, LogOut, ChevronRight as ArrowLink, Wallet, Star } from "lucide-react";
import { CurrencyEngine } from "@/features/currency/currency-engine";
import { getSalaryCycle } from "@/lib/cycle";

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const [userName, setUserName] = useState("Memuat...");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Konbanwa");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalJpy, setTotalJpy] = useState(0);
  const [rate, setRate] = useState(113);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  // Siklus Gaji
  const [salaryDay, setSalaryDay] = useState(10);
  const [cycleOffset, setCycleOffset] = useState(0);
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleIncome, setCycleIncome] = useState(0);
  const [cycleExpense, setCycleExpense] = useState(0);

  // Quick Entry Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [amountInput, setAmountInput] = useState("");
  const [merchantInput, setMerchantInput] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [modalDate, setModalDate] = useState(getLocalDateString());

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferSource, setTransferSource] = useState("");
  const [transferDestination, setTransferDestination] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferDate, setTransferDate] = useState(getLocalDateString());

  // Scan Bank Modal
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const approxIdr = CurrencyEngine.calculateConverted(totalJpy, rate);
  const netSavings = cycleIncome - cycleExpense;
  const savingsRate = cycleIncome > 0 ? Math.max(0, ((netSavings / cycleIncome) * 100)).toFixed(1) : "0.0";

  const refreshLiveRate = async () => {
    setIsRefreshingRate(true);
    try {
      const res = await fetch("/api/currency");
      if (res.ok) {
        const data = await res.json();
        if (data.rate) setRate(data.rate);
      }
    } catch (e) {
      console.error("Gagal update kurs live:", e);
    } finally {
      setIsRefreshingRate(false);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting("Ohayou gozaimasu 🌅");
    else if (hour >= 11 && hour < 18) setGreeting("Konnichiwa ☀️");
    else setGreeting("Konbanwa 🌙");
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        window.location.replace("/login");
        return;
      }
      const meData = await meRes.json();
      if (meData?.user) {
        setUserName(meData.user.name || "User");
        setUserAvatar(meData.user.avatarUrl || null);
        if (meData.user.salaryDate) setSalaryDay(meData.user.salaryDate);
      }

      const [accRes, txRes, currRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/transactions"),
        fetch("/api/currency"),
      ]);

      if (currRes.ok) {
        const currData = await currRes.json();
        if (currData.rate) setRate(currData.rate);
      }

      let currentAccounts: any[] = [];
      if (accRes.ok) {
        currentAccounts = await accRes.json();
        setAccounts(currentAccounts);
        const sum = currentAccounts.reduce((a: number, b: any) => a + Number(b.currentBalance), 0);
        setTotalJpy(sum);

        // Cari Dompet Utama (Bank pertama atau akun pertama)
        const primaryAcc = currentAccounts.find((a) => a.type === "BANK") || currentAccounts[0];
        if (primaryAcc) {
          if (!selectedWallet) setSelectedWallet(primaryAcc.id);
          if (!transferSource) setTransferSource(primaryAcc.id);
          const otherAcc = currentAccounts.find((a) => a.id !== primaryAcc.id);
          if (otherAcc && !transferDestination) setTransferDestination(otherAcc.id);
        }
      }

      if (txRes.ok) {
        const txs = await txRes.json();
        setTransactions(txs);
        recalcCycleMetrics(txs, meData?.user?.salaryDate || salaryDay, cycleOffset);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const recalcCycleMetrics = (txs: any[], day: number, offset: number) => {
    const cycle = getSalaryCycle(new Date(), day, offset);
    setCycleLabel(cycle.label);

    let inc = 0;
    let exp = 0;
    txs.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate >= cycle.startDate && txDate <= cycle.endDate) {
        const val = Number(tx.total);
        if (tx.type === "INCOME") inc += val;
        if (tx.type === "EXPENSE") exp += val;
      }
    });

    setCycleIncome(inc);
    setCycleExpense(exp);
  };

  const isInitialMounted = useRef(false);

  useEffect(() => {
    if (!isInitialMounted.current) {
      isInitialMounted.current = true;
      loadData();
    } else {
      // Hanya hitung ulang metrik lokal tanpa fetch auth berulang
      recalcCycleMetrics(transactions, salaryDay, cycleOffset);
    }
  }, [cycleOffset]);

  const handleQuickSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput) return;

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: modalType,
        amount: parseFloat(amountInput),
        merchant: merchantInput || (modalType === "EXPENSE" ? "Quick Expense" : "Quick Income"),
        sourceAccountId: selectedWallet,
        currency: "JPY",
        date: modalDate,
      }),
    });

    if (res.ok) {
      setAmountInput("");
      setMerchantInput("");
      setIsModalOpen(false);
      loadData();
    } else {
      const err = await res.json();
      alert(err.error || "Gagal menyimpan transaksi");
    }
  };

  const handleTransferSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount) return;

    if (transferSource === transferDestination) {
      alert("Dompet asal dan tujuan tidak boleh sama!");
      return;
    }

    const sourceAcc = accounts.find((a) => a.id === transferSource);
    const destAcc = accounts.find((a) => a.id === transferDestination);
    const labelMerchant = transferNote
      ? `Transfer: ${sourceAcc?.name || "Wallet"} → ${destAcc?.name || "Wallet"} (${transferNote})`
      : `Transfer: ${sourceAcc?.name || "Wallet"} → ${destAcc?.name || "Wallet"}`;

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "TRANSFER",
        amount: parseFloat(transferAmount),
        merchant: labelMerchant,
        sourceAccountId: transferSource,
        destinationAccountId: transferDestination,
        currency: "JPY",
        date: transferDate,
      }),
    });

    if (res.ok) {
      setTransferAmount("");
      setTransferNote("");
      setIsTransferModalOpen(false);
      loadData();
    } else {
      const err = await res.json();
      alert(err.error || "Gagal memproses transfer");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append("screenshot", file);

    try {
      const res = await fetch("/api/transactions/parse-statement", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setParsedItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmBatch = async () => {
    if (parsedItems.length === 0) return;
    const bankAccount = accounts.find((a) => a.type === "BANK") || accounts[0];

    const res = await fetch("/api/transactions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: parsedItems,
        sourceAccountId: bankAccount?.id,
      }),
    });

    if (res.ok) {
      setParsedItems([]);
      setIsScanModalOpen(false);
      loadData();
    }
  };

  const currentCycle = getSalaryCycle(new Date(), salaryDay, cycleOffset);
  const cycleTransactions = transactions.filter((tx) => {
    const d = new Date(tx.date);
    return d >= currentCycle.startDate && d <= currentCycle.endDate;
  });

  // Tentukan akun mana yang dianggap akun utama (Biasanya Bank Utama)
  const primaryAccountId = (accounts.find((a) => a.type === "BANK") || accounts[0])?.id;

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col pb-20 md:pb-8 font-sans">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full p-4 pt-8 flex justify-between items-center relative">
        <div>
          <p className="text-xs text-neutral-400">{greeting}</p>
          <h1 className="text-lg font-bold text-white tracking-tight">Halo, {userName}</h1>
        </div>

        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-white shadow-md active:scale-95 transition"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{userName ? userName.charAt(0).toUpperCase() : "U"}</span>
            )}
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl z-50 p-2 py-3 backdrop-blur-md">
              <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
                <p className="text-xs font-semibold text-white truncate">{userName}</p>
                <p className="text-[10px] text-neutral-400">Gajian: Tanggal {salaryDay} tiap bulan</p>
              </div>

              <Link
                href="/profile"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl transition text-left"
              >
                <User className="w-4 h-4 text-neutral-400" />
                <span>Profil & Foto</span>
              </Link>

              <Link
                href="/accounts"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl transition text-left"
              >
                <Wallet className="w-4 h-4 text-neutral-400" />
                <span>Kelola Dompet & Saldo</span>
              </Link>

              <Link
                href="/transactions"
                onClick={() => setIsProfileMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl transition text-left"
              >
                <Sliders className="w-4 h-4 text-neutral-400" />
                <span>Riwayat Transaksi</span>
              </Link>

              <div className="my-1 border-t border-neutral-800/60" />

              <button
                onClick={async () => {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch (e) {
                    console.error(e);
                  }
                  window.location.replace("/login");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto w-full px-4 space-y-4">
        {/* Main Balance Hero Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 shadow-xl">
          <p className="text-xs text-neutral-400 uppercase tracking-wider font-medium">Total Balance</p>
          
          <div className="flex items-start justify-between mt-1">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                {CurrencyEngine.formatJPY(totalJpy)}
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                ≈ {CurrencyEngine.formatIDR(approxIdr)}
              </p>
            </div>

            {/* Badge Live Kurs Yen ke Rupiah */}
            <button
              onClick={refreshLiveRate}
              disabled={isRefreshingRate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 active:scale-95 transition"
              title="Klik untuk update kurs live terbaru"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-neutral-200">
                ¥1 = Rp {rate.toLocaleString()}
              </span>
              <RefreshCcw className={`w-3 h-3 text-neutral-400 ${isRefreshingRate ? "animate-spin text-white" : ""}`} />
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={() => setCycleOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white active:scale-95 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                {cycleOffset === 0 ? "Siklus Berjalan" : "Siklus Sebelumnya"}
              </span>
              <span className="text-xs font-semibold text-white">{cycleLabel}</span>
            </div>
            <button
              disabled={cycleOffset >= 0}
              onClick={() => setCycleOffset((prev) => prev + 1)}
              className={`p-1.5 rounded-lg bg-neutral-800 text-neutral-300 ${cycleOffset >= 0 ? "opacity-30 cursor-not-allowed" : "hover:text-white active:scale-95 transition"}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="p-2.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/50">
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-emerald-400" /> Income
              </span>
              <span className="text-xs font-bold text-emerald-400 mt-1 block truncate">
                +{CurrencyEngine.formatJPY(cycleIncome)}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/50">
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-rose-400" /> Expense
              </span>
              <span className="text-xs font-bold text-rose-400 mt-1 block truncate">
                -{CurrencyEngine.formatJPY(cycleExpense)}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-neutral-950/60 border border-neutral-800/50">
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" /> Savings
              </span>
              <span className="text-xs font-bold text-sky-400 mt-1 block truncate">
                {savingsRate}%
              </span>
            </div>
          </div>
        </div>

        {/* 4 Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => { setModalType("EXPENSE"); setModalDate(getLocalDateString()); setIsModalOpen(true); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-900 border border-neutral-800 active:scale-95 transition"
          >
            <div className="h-9 w-9 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-medium">Expense</span>
          </button>

          <button
            onClick={() => { setModalType("INCOME"); setModalDate(getLocalDateString()); setIsModalOpen(true); }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-900 border border-neutral-800 active:scale-95 transition"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1">
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-medium">Income</span>
          </button>

          <button
            onClick={() => {
              if (accounts.length < 2) {
                alert("Anda memerlukan minimal 2 dompet untuk transfer.");
                return;
              }
              setTransferDate(getLocalDateString());
              setIsTransferModalOpen(true);
            }}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-900 border border-neutral-800 active:scale-95 transition"
          >
            <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center mb-1">
              <RefreshCcw className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Transfer</span>
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-900 border border-neutral-800 active:scale-95 transition"
          >
            <div className="h-9 w-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium">Scan Bank</span>
          </button>
        </div>

        {/* Wallets & Accounts Overview (Menampilkan Dompet Utama) */}
        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="text-sm font-semibold text-neutral-300">Wallets & Accounts</h2>
            <Link
              href="/accounts"
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5"
            >
              <span>Kelola</span>
              <ArrowLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => {
              const isPrimary = acc.id === primaryAccountId;
              return (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-2xl border transition relative ${
                    isPrimary
                      ? "bg-neutral-900 border-amber-500/40 shadow-sm shadow-amber-500/5"
                      : "bg-neutral-900/90 border-neutral-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-300 font-medium truncate">{acc.name}</p>
                    {isPrimary && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold flex items-center gap-0.5 shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-300" /> Utama
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white mt-1.5">
                    {CurrencyEngine.formatJPY(Number(acc.currentBalance))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5 Transaksi Terkini */}
        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <h2 className="text-sm font-semibold text-neutral-300">Transaksi Terbaru</h2>
            <Link
              href="/transactions"
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5"
            >
              <span>Lihat Semua ({cycleTransactions.length})</span>
              <ArrowLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {cycleTransactions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
                Belum ada transaksi di siklus {cycleLabel}.
              </div>
            ) : (
              cycleTransactions.slice(0, 5).map((tx) => {
                const isIncome = tx.type === "INCOME";
                const isTransfer = tx.type === "TRANSFER";

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                  >
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

                    <div className="text-right">
                      <p className={`text-xs font-bold ${isTransfer ? "text-sky-400" : isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                        {isTransfer ? "⇄ " : isIncome ? "+" : "-"}{CurrencyEngine.formatJPY(Number(tx.total))}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        ≈ {CurrencyEngine.formatIDR(Number(tx.convertedAmount))}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Form Transfer Antar-Dompet */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <RefreshCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Transfer Antar-Dompet</h3>
                <p className="text-[11px] text-neutral-400">Pindahkan saldo antar dompet tanpa mengubah Income/Expense.</p>
              </div>
            </div>

            <form onSubmit={handleTransferSave} className="space-y-3.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nominal Transfer (¥ JPY)</label>
                <input
                  type="number"
                  autoFocus
                  required
                  min="1"
                  placeholder="0"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-2xl font-bold text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">Dari Dompet</label>
                  <select
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (¥{Number(acc.currentBalance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">Ke Dompet</label>
                  <select
                    value={transferDestination}
                    onChange={(e) => setTransferDestination(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (¥{Number(acc.currentBalance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Tarik tunai ATM, Top up Suica"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg active:scale-95 transition"
                >
                  Proses Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Entry Modal (Expense / Income) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {modalType === "EXPENSE" ? "Catat Pengeluaran" : "Catat Pemasukan"}
            </h3>
            <form onSubmit={handleQuickSave} className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Nominal (¥ JPY)</label>
                <input
                  type="number"
                  autoFocus
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xl font-bold text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Keterangan / Merchant</label>
                <input
                  type="text"
                  value={merchantInput}
                  onChange={(e) => setMerchantInput(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Wallet</label>
                <select
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.id === primaryAccountId ? "(Dompet Utama)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl text-xs font-bold ${modalType === "EXPENSE" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"}`}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Scan Bank */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl md:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-2">Scan Mutasi M-Banking</h3>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            {parsedItems.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-8 h-8 text-neutral-400" />
                <span className="text-xs font-semibold text-white">
                  {isAnalyzing ? "Menganalisis screenshot..." : "Pilih Screenshot Mutasi"}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-neutral-800 text-neutral-300">{item.type}</span>
                        <p className="text-xs font-medium text-white mt-1">{item.description}</p>
                        <p className="text-[10px] text-neutral-500">{item.date}</p>
                      </div>
                      <span className="text-xs font-bold text-white">¥{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => { setParsedItems([]); setIsScanModalOpen(false); }}
                    className="flex-1 py-3 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmBatch}
                    className="flex-1 py-3 rounded-xl bg-white text-black text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" /> Masukkan ke Bank
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}