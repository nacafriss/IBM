# Pocketly – Personal Expense Tracker

Aplikasi web sederhana untuk membantu pengguna mencatat, mengelola, dan memantau pemasukan serta pengeluaran pribadi. Pocketly dikembangkan dengan bantuan IBM Bob sebagai AI coding assistant menggunakan HTML, Tailwind CSS, dan Vanilla JavaScript.

## Project Overview

Pocketly bertujuan mempermudah pengelolaan keuangan sehari-hari melalui pencatatan transaksi yang praktis dan terstruktur. Pengguna dapat mengetahui total saldo, pemasukan, dan pengeluaran, serta melihat riwayat transaksi berdasarkan kategori.

Aplikasi ini dirancang dengan tampilan minimalis, modern, dan responsif sehingga mudah digunakan oleh mahasiswa maupun individu yang ingin mengelola keuangan pribadi.

## Features

- **Dashboard Summary:** Menampilkan total saldo, pemasukan, dan pengeluaran secara otomatis.
- **Transaction Management (CRUD):** Menambahkan, melihat, mengedit, dan menghapus transaksi.
- **Transaction Categories:** Mengelompokkan transaksi berdasarkan kategori pemasukan dan pengeluaran.
- **Transaction Filter:** Memfilter transaksi berdasarkan All Transactions, Income, dan Expenses.
- **Transaction Search:** Mencari transaksi berdasarkan nama.
- **Data Persistence:** Menyimpan data transaksi menggunakan Local Storage agar data tetap tersedia setelah halaman di-refresh.
- **Input Validation:** Memvalidasi data transaksi sebelum disimpan.

## Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Struktur halaman dan komponen website |
| Tailwind CSS | Styling dan layout antarmuka |
| Vanilla JavaScript | Logika aplikasi dan interaksi pengguna |
| Local Storage | Penyimpanan data transaksi di browser |
| IBM Bob | AI coding assistant dalam proses pengembangan |

## Getting Started

### Prerequisites

- Web browser (Google Chrome, Firefox, atau lainnya).
- Code editor seperti Visual Studio Code.

### Installation

1. Clone repository:

```bash
git clone <repository-url>
```

2. Masuk ke folder project:

```bash
cd Pocketly
```

3. Buka folder project menggunakan Visual Studio Code.

4. Jalankan `index.html` melalui browser atau menggunakan ekstensi Live Server.

Tidak diperlukan instalasi framework JavaScript maupun backend server untuk menjalankan aplikasi.

## How to Use

1. Buka aplikasi Pocketly melalui browser.
2. Lihat ringkasan saldo, total pemasukan, dan pengeluaran pada dashboard.
3. Tambahkan transaksi melalui form yang tersedia.
4. Isi informasi transaksi, seperti nama, nominal, kategori, tanggal, dan tipe transaksi.
5. Simpan transaksi untuk memperbarui ringkasan keuangan.
6. Gunakan fitur pencarian dan filter untuk menemukan transaksi tertentu.
7. Edit atau hapus transaksi sesuai kebutuhan.

## Data Storage

Pocketly menggunakan browser Local Storage untuk menyimpan data transaksi secara lokal.

Data yang tersimpan dapat diakses kembali ketika pengguna membuka aplikasi melalui browser yang sama. Data tidak disinkronkan secara otomatis ke perangkat atau browser lain.

## Prompt Architecture

Pengembangan Pocketly menggunakan pendekatan Prompt Layering dengan tiga layer:

- **Layer 1 – Role & Context:** Memberikan peran kepada AI sebagai Senior Frontend Engineer.
- **Layer 2 – Task & Requirements:** Menjelaskan konsep aplikasi, kebutuhan fitur, dan fungsionalitas yang harus dikembangkan.
- **Layer 3 – Constraints & Output:** Menentukan teknologi, struktur file, desain antarmuka, dan ketentuan hasil kode.

## Prompt Iteration

Pengembangan prompt dilakukan secara bertahap, dimulai dari penentuan konsep aplikasi, penambahan kebutuhan fungsional, penentuan penyimpanan data dan validasi, hingga penyempurnaan desain serta struktur kode.

Iterasi dilakukan untuk menghasilkan aplikasi yang sesuai dengan kebutuhan, memiliki fitur yang berfungsi, dan mudah dikembangkan lebih lanjut.

## Future Development

Beberapa pengembangan yang dapat dilakukan pada Pocketly di masa mendatang:

- **Financial Visualization:** Grafik pemasukan dan pengeluaran.
- **User Authentication:** Sistem registrasi dan login pengguna.
- **Database Integration:** Penyimpanan data menggunakan database.

## Project Information

**Project Name:** Pocketly

**Project Type:** Personal Expense Tracker

**Development Assistant:** IBM Bob

**Programming Technologies:** HTML, Tailwind CSS, Vanilla JavaScript

**Storage:** Browser Local Storage

---

*Pocketly – Track your spending, manage your money.*
