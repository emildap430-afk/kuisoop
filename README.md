# 🎯 OOP MISSION

Website kuis interaktif OOP untuk siswa SMK kelas XI dengan fitur:

- 15 soal pilihan ganda bertema mini game edukasi
- navigasi KEMBALI / LANJUT
- jawaban tersimpan selama pengerjaan
- skor otomatis dan hasil langsung ditampilkan
- pembahasan soal setelah selesai
- penyimpanan hasil ke database SQLite
- dashboard guru dengan login, search, filter, dan detail siswa
- QR code akses publik

## Cara menjalankan

1. Install dependencies:
   npm install
2. Salin file .env.example menjadi .env dan sesuaikan pengaturan.
3. Jalankan:
   npm start
4. Buka:
   http://localhost:3000

## Login guru

Username dan password default:

- Username: admin
- Password: oopmission123

Anda dapat mengubahnya di file .env.

## Catatan penting

- QR code menggunakan nilai PUBLIC_URL di .env.
- Untuk akses publik yang benar, setel PUBLIC_URL ke URL yang bisa diakses dari internet.
- Sistem tanpa timer, sesuai persyaratan.
