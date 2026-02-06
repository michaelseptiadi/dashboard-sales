

# Sistem Dashboard Pelacakan Penjualan - Toko Bahan Bangunan

## Ringkasan
Membangun aplikasi dashboard admin lengkap dalam Bahasa Indonesia untuk toko bahan bangunan, menggantikan alur kerja Excel yang ada. Aplikasi menggunakan tema profesional biru, terhubung langsung ke Supabase, dan dioptimalkan untuk input transaksi yang cepat.

---

## 1. Pengaturan Database & Migrasi

Membuat semua tabel di Supabase sesuai struktur yang diberikan:
- **products** – data produk dengan harga jual, harga modal, stok minimum
- **categories** – kategori produk
- **units** – satuan produk (kg, pcs, sak, dll)
- **customers** – data pelanggan
- **payment_methods** – metode pembayaran
- **sales_orders** – header transaksi penjualan
- **sales_items** – detail item per transaksi
- **inventory_movements** – pergerakan stok masuk/keluar

Membuat RPC function `create_sales_transaction` di Supabase yang menangani pembuatan sales order, sales items, dan inventory movements dalam satu transaksi atomic.

Mengaktifkan Row Level Security (RLS) pada semua tabel agar hanya pengguna yang terautentikasi yang dapat mengakses data.

Seed data awal untuk categories, units, dan payment_methods.

---

## 2. Layout & Navigasi Aplikasi

- **Sidebar navigasi** di sisi kiri dengan menu: Dashboard, Penjualan, Riwayat, Produk, Pelanggan
- **Header** menampilkan nama pengguna dan judul halaman
- **Tema biru profesional** yang bersih dan rapi
- **Desain responsif** – optimal di desktop, tetap berfungsi baik di tablet

---

## 3. Halaman Dashboard

- **Kartu ringkasan**: Total penjualan hari ini, Jumlah transaksi hari ini
- **Produk terlaris** – tabel 5-10 produk paling banyak terjual
- **Produk stok rendah** – daftar produk yang stoknya di bawah minimum, ditandai warna merah/kuning
- **Grafik penjualan** – chart garis/batang menampilkan penjualan per hari (7-30 hari terakhir)

---

## 4. Halaman Transaksi Penjualan (Fitur Utama)

Halaman ini dioptimalkan untuk kecepatan input:

- **Nomor invoice otomatis** ditampilkan di atas form
- **Pemilihan pelanggan**: dropdown pencarian pelanggan yang sudah ada ATAU input manual (nama, telepon, alamat)
- **Pemilihan metode pembayaran** via dropdown
- **Field metode pengiriman** (opsional, input teks bebas)
- **Tabel input produk**:
  - Pencarian produk dengan autocomplete (cari berdasarkan nama atau kode)
  - Harga otomatis terisi saat produk dipilih
  - Input kuantitas
  - Input diskon per item
  - Kalkulasi subtotal otomatis per baris
  - Tombol hapus per baris
  - Tombol tambah baris baru
- **Ringkasan total**: Total amount, Total diskon, Grand total – terupdate secara real-time
- **Field catatan** (opsional)
- **Tombol submit** yang memanggil RPC function `create_sales_transaction`
- **Feedback sukses** dengan opsi membuat transaksi baru

---

## 5. Halaman Riwayat Penjualan

- **Tabel daftar semua transaksi** dengan pagination
- **Filter tanggal** (rentang tanggal dari-sampai)
- **Pencarian** berdasarkan nomor invoice
- **Klik pada baris** membuka modal detail transaksi:
  - Informasi header (invoice, tanggal, pelanggan, metode bayar)
  - Tabel item yang dibeli beserta kuantitas, harga, diskon, subtotal
  - Grand total

---

## 6. Halaman Manajemen Produk

- **Tabel daftar produk** dengan kolom: kode, nama, kategori, satuan, harga jual, stok saat ini, status
- **Stok dihitung** dari `sum(qty_in) - sum(qty_out)` di tabel inventory_movements
- **Produk stok rendah** ditandai visual (highlight merah/kuning)
- **Tombol tambah produk** – membuka modal form
- **Tombol edit** per baris – membuka modal form
- **Toggle aktif/nonaktif** per produk
- **Pencarian** berdasarkan nama/kode produk
- **Filter** berdasarkan kategori
- **Pagination** untuk performa optimal

---

## 7. Halaman Manajemen Pelanggan

- **Tabel daftar pelanggan** dengan nama, telepon, alamat, email, status
- **Pencarian** berdasarkan nama atau telepon
- **Tombol tambah pelanggan** – modal form
- **Tombol edit** per baris – modal form
- **Pagination**

---

## 8. Komponen & Arsitektur

- **Struktur modular**: setiap halaman dan fitur dipisahkan ke komponen sendiri agar mudah dipelihara dan dikembangkan
- **Custom hooks** untuk interaksi Supabase (query produk, pelanggan, transaksi)
- **State management** menggunakan React state + React Query untuk caching dan sinkronisasi data
- **Loading states** dan **error handling** di semua operasi data
- **Form validation** menggunakan Zod untuk memastikan data yang diinput valid

