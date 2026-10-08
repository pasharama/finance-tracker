# 💴 Finance Tracker - Japan Edition (v1.0.0)

Aplikasi pencatat dan pengelola keuangan modern multi-user yang dioptimalkan untuk WNI/ekspatriat di Jepang. Dibangun dengan Next.js App Router, Prisma ORM, Neon PostgreSQL, dan Google Gemini AI untuk otomasi parsing mutasi perbankan via iOS Shortcuts.

---

## ✨ Fitur Utama

- **Multi-User Data Isolation**: Sistem autentikasi berbasis HTTP-only JWT session + bcrypt. Data akun, saldo, dan riwayat transaksi terisolasi penuh antar pengguna.
- **Dual Currency Engine (JPY & IDR)**: Perhitungan nilai kurs live real-time (Yen ke Rupiah) dengan caching cerdas.
- **Manajemen Multi-Dompet**:
  - Dukungan akun Bank, Tunai (Cash JPY), dan e-Money.
  - Penandaan **Dompet Utama** (*Primary Wallet*) otomatis.
  - Fitur transfer antar-dompet tanpa mendistorsi arus kas Income/Expense.
  - Penyesuaian saldo dan koreksi manual.
- **Pelacakan Siklus Gajian (Payday Cycle)**:
  - Fleksibilitas tanggal gajian bulanan (default tgl 10 atau 25).
  - Navigasi riwayat siklus bulan berjalan dan bulan sebelumnya.
  - Kalkulasi rasio tabungan (*Savings Rate*).
- **AI Bank Statement OCR**:
  - Ekstraksi screenshot mutasi rekening Jepang menggunakan Google Gemini Vision.
  - Verifikasi otomatis dan batch import transaksi langsung ke saldo bank.
- **iOS Shortcut Automation**:
  - Integrasi fitur *Back Tap* iPhone untuk upload screenshot mutasi otomatis via webhook API.
- **Progressive Web App (PWA)**:
  - Tampilan layar penuh mandiri (*standalone*) saat dipasang ke Home Screen Safari iOS.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 18/19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Database & ORM**: [Prisma](https://www.prisma.io/) & [Neon PostgreSQL](https://neon.tech/) (Serverless Cloud DB)
- **Authentication**: JWT (`jose`) & `bcryptjs`
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Hosting**: [Vercel](https://vercel.com/)

---

## 🚀 Panduan Setup Lokal

### 1. Clone Repository
```bash
git clone [https://github.com/pasharama/finance-tracker.git](https://github.com/pasharama/finance-tracker.git)
cd finance-tracker
