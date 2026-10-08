"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, Globe, Calendar, User, Save, LogOut, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [salaryDate, setSalaryDate] = useState("10");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [defaultCurrency, setDefaultCurrency] = useState("JPY");
  const [secondaryCurrency, setSecondaryCurrency] = useState("IDR");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.salaryDate !== undefined) setSalaryDate(String(data.salaryDate));
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.timezone) setTimezone(data.timezone);
        if (data.defaultCurrency) setDefaultCurrency(data.defaultCurrency);
        if (data.secondaryCurrency) setSecondaryCurrency(data.secondaryCurrency);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  // Kompresi foto otomatis di client agar payload ringan (< 200KB)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 300; // Resize resolusi avatar ke maks 300x300
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Export gambar ke JPEG berkualitas tinggi namun ukuran file sangat kecil
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          salaryDate: parseInt(salaryDate, 10),
          avatarUrl,
          timezone,
          defaultCurrency,
          secondaryCurrency,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setStatusMessage({ type: "success", text: "Perubahan berhasil disimpan!" });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage({ type: "error", text: result.error || "Gagal menyimpan perubahan." });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Keluar dari Finance Tracker?")) {
      window.location.href = "/";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-neutral-400">Memuat profil...</p>
      </div>
    );
  }

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
        <h1 className="text-sm font-bold text-white">Profil & Pengaturan</h1>
        <div className="w-8" />
      </div>

      <div className="max-w-md mx-auto w-full px-4 pt-6 space-y-5">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-700 shadow-xl flex items-center justify-center text-3xl font-extrabold text-white">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{name ? name.charAt(0).toUpperCase() : "U"}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 shadow-lg active:scale-95 transition"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-2 font-medium">{email || "owner@financetracker.local"}</p>
          </div>

          {/* Alert Status Notifikasi */}
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-medium ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form Informasi User */}
          <div className="p-4 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-3.5">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-neutral-400" /> Informasi Pengguna
            </h2>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Nama Tampilan</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-white transition"
              />
            </div>
          </div>

          {/* Pengaturan Tanggal Gajian */}
          <div className="p-4 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-3.5">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Siklus Gajian (Reset Bulanan)
            </h2>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">
                Tanggal Gajian Setiap Bulan (1 - 31)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={salaryDate}
                onChange={(e) => setSalaryDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-base font-bold text-white outline-none focus:border-emerald-500 transition"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                Ringkasan Income, Expense, dan Savings di dashboard akan otomatis me-reset perhitungannya setiap tanggal ini.
              </p>
            </div>
          </div>

          {/* Pengaturan Mata Uang & Wilayah */}
          <div className="p-4 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-3.5">
            <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" /> Mata Uang & Wilayah
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Mata Uang Utama</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="JPY">JPY (¥ Japanese Yen)</option>
                  <option value="IDR">IDR (Rp Rupiah)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Mata Uang Sekunder</label>
                <select
                  value={secondaryCurrency}
                  onChange={(e) => setSecondaryCurrency(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                >
                  <option value="IDR">IDR (Rp Rupiah)</option>
                  <option value="JPY">JPY (¥ Japanese Yen)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Zona Waktu</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
              >
                <option value="Asia/Tokyo">Asia/Tokyo (JST, GMT+9)</option>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB, GMT+7)</option>
              </select>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>

        {/* Tombol Logout */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/10 active:scale-95 transition"
          >
            <LogOut className="w-4 h-4" /> Keluar dari Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
}