# IT Asset Nexus

**IT Asset Nexus** adalah sistem pengurusan aset IT dan pinjaman peralatan jabatan yang dibangunkan menggunakan Next.js. Sistem ini direka untuk memudahkan pentadbir (Admin) mengesan inventori fizikal dan membolehkan kakitangan (Staff) memohon pinjaman peralatan secara digital.

## 🚀 Ciri-Ciri Utama

### 🛠️ Bahagian Pentadbir (Admin)
- **Dashboard**: Gambaran keseluruhan statistik aset, permohonan tertunda, status kesihatan inventori, dan amaran item yang lewat dipulangkan (*Overdue*).
- **Asset Management**: Mendaftarkan aset baru dengan maklumat Jenis, Jenama, Model, dan No. Taging (Asset Tag). Setiap pendaftaran akan mencipta unit fizikal secara automatik.
- **Unit Inventory**: Memantau status setiap unit fizikal secara individu (Tersedia, Dipinjam, atau Dalam Penyelenggaraan) serta mengemaskini rekod kerosakan.
- **Borrow Requests**: Menguruskan permohonan pinjaman daripada staf, meluluskan pemulangan, dan melihat sejarah pegawai yang meluluskan (*Managed By*).
- **Manual Assignment**: Admin boleh menetapkan pinjaman aset kepada staf secara terus tanpa memerlukan staf log masuk (sesuai untuk kes *walk-in*).
- **User Management**: Menguruskan akaun pengguna, jabatan, dan peranan sistem (Admin/Staff).

### 👥 Bahagian Kakitangan (Staff)
- **Asset Catalogue**: Melihat senarai peralatan IT yang tersedia untuk dipinjam dengan maklumat taging yang jelas.
- **Request System**: Membuat permohonan pinjaman dengan menyatakan tujuan, tarikh pinjam, dan tarikh pulang.
- **My Requests**: Memantau status permohonan (Pending, Approved, Rejected) dan memulakan proses pemulangan (*Return Request*).
- **Overdue Alerts**: Peringatan visual jika aset yang dipinjam telah melebihi tarikh pemulangan.

## 💻 Teknologi yang Digunakan
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Bahasa**: TypeScript
- **UI & Styling**: [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
- **Ikon**: [Lucide React](https://lucide.dev/)
- **Pengurusan Data**: `localStorage` (Prototaip ini menggunakan simpanan data tempatan dalam pelayar untuk kemudahan ujian tanpa pangkalan data awan).

## 🔑 Maklumat Log Masuk (Akaun Contoh)
| Peranan | Emel | Kata Laluan |
| :--- | :--- | :--- |
| **Admin** | `admin@it.gov.my` | `admin123` |
| **Staff** | `siti@dept.gov.my` | `user123` |

## 🛠️ Pembangunan & Deployment
Sistem ini dibina sebagai aplikasi Next.js standard. Untuk menjalankan sistem ini secara tempatan:

1. Pasang dependensi: `npm install`
2. Jalankan mod pembangunan: `npm run dev`
3. Bina untuk produksi: `npm run build`

**Nota Deployment:** Kerana sistem ini menggunakan `localStorage`, data yang dimasukkan oleh pengguna akan disimpan dalam pelayar peranti masing-masing. Untuk penggunaan secara berpusat pada masa hadapan, migrasi ke Firebase Firestore atau pangkalan data SQL adalah disyorkan.
# IT-Asset-Nexus
# Nexus-IT
