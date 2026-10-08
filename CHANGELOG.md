# 📜 Changelog - Finance Tracker Japan

Semua pembaruan penting pada proyek ini dicatat dalam dokumen ini.

---

## [v1.0.0] - First Stable Release 🎉
*Tanggal Rilis: 2026-10-09*

### 🚀 Fitur Utama
- **Multi-User Isolation**: Registrasi, login, logout aman berbasis session cookie JWT + bcrypt dengan data dompet dan transaksi yang terisolasi penuh per user.
- **Neon Cloud PostgreSQL Integration**: Database cloud persisten menggantikan SQLite lokal, siap untuk serverless/cloud hosting.
- **Dual Currency Engine (JPY & IDR)**:
  - Format Yen (¥) dan Rupiah (Rp).
  - Kurs live real-time terhubung ke API pasar valas publik dengan tombol refresh manual dan auto-cache.
- **Wallets & Accounts Management**:
  - Penandaan **Dompet Utama** (*Primary Wallet*) otomatis.
  - Dukungan multiple wallet (Bank, Tunai/Cash, e-Money/Suica).
  - Transfer saldo antar-dompet tanpa mengacaukan neraca Income/Expense.
  - Penyesuaian saldo dan koreksi manual.
- **Siklus Gajian (Payday Cycle)**:
  - Pelacakan arus kas berdasarkan tanggal gajian kustom (default tgl 10 atau 25).
  - Navigasi mundur-maju siklus bulan berjalan dan bulan lalu.
  - Kalkulasi rasio tabungan (*Savings Rate*).
- **OCR AI Bank Statement Parsing**:
  - Ekstraksi screenshot mutasi perbankan Jepang menggunakan Gemini API Vision.
  - Validasi dan batch import ke akun Bank.
- **iOS Shortcut Automation**:
  - Endpoint webhook untuk integrasi *Back Tap* screenshot iPhone langsung ke tracker.
- **PWA Ready**:
  - Manifest dan konfigurasi tampilan full-screen standalone di Safari iOS.

---

## 🔮 Rencana Pembaruan Mendatang (Roadmap v1.1.0+)
- [ ] Export laporan keuangan ke CSV / Excel.
- [ ] Grafik analitik pengeluaran berdasarkan kategori (Food, Transport, Utilities, dll).
- [ ] Pengingat tagihan tetap bulanan (*Recurring Expenses* seperti sewa apartemen & listrik).
- [ ] Filter & pencarian transaksi lebih detail (berdasarkan range nominal dan kata kunci).