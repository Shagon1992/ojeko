# 🛵 OjekO — Aplikasi Ojek & Delivery Ringan Berbasis Web (PWA)

**OjekO** adalah aplikasi ojek dan pengantaran lokal berbasis web yang ringan, cepat, dan bisa di-*install* langsung di HP seperti aplikasi native Android/iOS tanpa melalui Play Store.

Dibangun untuk kebutuhan operasional ojek internal dengan fitur pengelolaan kurir, pelanggan, dan laporan pengiriman yang lengkap.

🌐 **Website:** [https://ojeko.vercel.app](https://ojeko.vercel.app)

---

## 🚀 Fitur Utama

### 👥 **Untuk Kurir**
- **Login pribadi untuk tiap kurir**  
  Setiap kurir memiliki akun masing-masing agar data pengiriman tercatat otomatis sesuai user.
- **Status aktif / tidak aktif (Available / Unavailable)**  
  Kurir bisa menandai dirinya siap menerima order atau sedang off.
- **Tombol cepat WhatsApp ke pelanggan**  
  Kirim pesan ke pelanggan tanpa perlu copy nomor.
- **Template pesan WhatsApp**  
  Simpan dan gunakan pesan bawaan untuk komunikasi cepat.
- **Pengambilan titik koordinat otomatis (GPS)**  
  Lokasi pelanggan direkam otomatis saat order selesai.

---

### 📦 **Untuk Admin**
- **Manajemen customer**  
  Data pelanggan mencakup nama, alamat, nomor HP, dan koordinat lokasi.
- **Perhitungan ongkir otomatis**  
  Masukkan jarak, sistem akan menghitung ongkir otomatis berdasarkan tarif.
- **Laporan Pengiriman**  
  Laporan bisa difilter berdasarkan:
  - Harian  
  - Bulanan  
  - Rentang tanggal kustom
- **Laporan Kinerja Kurir**  
  Menampilkan jumlah pengiriman, total jarak, dan total pendapatan kurir.
- **Sinkronisasi data dari sistem lama**  
  Data pelanggan lama bisa diadaptasi dengan format baru.

---

## 🧭 Panduan Penggunaan

### 🏁 **1. Buka Aplikasi**
Buka di browser HP:  
👉 [https://ojeko.vercel.app](https://ojeko.vercel.app)

### 📲 **2. Install ke Layar Utama**
Jika muncul notifikasi **“Add to Home Screen”**, klik **Install**.  
Atau bisa manual:
- Chrome → klik ⋮ → *Add to Home screen*
- Safari → Share → *Add to Home Screen*

### 🚚 **3. Penggunaan oleh Kurir**
1. Login sesuai akun masing-masing.  
2. Pastikan status “Available” saat siap menerima order.  
3. Lihat daftar order pelanggan.  
4. Klik tombol WA untuk menghubungi pelanggan.  
5. Setelah obat dikirim, klik **“Selesai”** di lokasi rumah pelanggan.  
   → Titik koordinat otomatis disimpan.  
6. Sistem akan menghitung ongkir & jarak secara otomatis.

---

## 🧩 Teknologi yang Digunakan

| Komponen | Teknologi |
|-----------|------------|
| **Frontend** | React / Vite / Tailwind CSS |
| **Backend** | Node.js + Express |
| **Database** | Supabase |
| **Deployment** | Vercel |
| **Map & Lokasi** | Leaflet.js |
| **PWA Support** | Service Worker, Manifest, Caching |

---

## ⚙️ Instalasi Lokal (Untuk Developer)

> Prasyarat: Node.js 18+, Git, dan akses ke database Supabase.

```bash
# Clone repository
git clone https://github.com/USERNAME/ojeko.git
cd ojeko

# Install dependencies
npm install

# Jalankan server lokal
npm run dev
