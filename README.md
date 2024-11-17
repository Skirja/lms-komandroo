# LMS Komandro

Ini adalah proyek [Next.js](https://nextjs.org/) untuk Learning Management System (LMS) Komandro.

## Persiapan

Ikuti langkah-langkah berikut untuk menyiapkan proyek ini di lingkungan lokal Anda:

1. Clone repositori ini:
   ```bash
   git clone https://github.com/your-username/lms-komandroo.git
   cd lms-komandroo
   ```

2. Install dependensi:
   ```bash
   npm install
   # atau
   yarn install
   ```

3. Siapkan variabel lingkungan:
   - Salin file `.env.example` menjadi `.env.local`
   - Isi variabel lingkungan yang diperlukan di `.env.local`

4. Jalankan server:
   ```bash
   npm run dev
   # atau
   yarn dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat hasilnya.
6. Setup Supabase:
   Langkah-langkah berikut akan menghubungkan proyek lokal Anda dengan proyek Supabase dan menginisialisasi database:

   a. Hubungkan proyek lokal dengan proyek Supabase:
      ```bash
      npx supabase link --project-ref <project-id>
      ```
      Ganti `<project-id>` dengan ID proyek Supabase Anda.

   b. Login ke Supabase CLI:
      ```bash
      npx supabase login
      ```
      Ikuti instruksi untuk mengautentikasi CLI dengan akun Supabase Anda.

   c. Terapkan migrasi database dan data awal:
      ```bash
      npx supabase db push --include-seed
      ```
      Perintah ini akan menjalankan file migrasi SQL dan memasukkan data awal ke database Anda.

   d. Buat admin pertama:
      ```bash
      node scripts/create-admin.js
      ```
      Script ini akan membuat akun admin pertama di database Anda.

   Pastikan Anda telah mengatur variabel lingkungan yang diperlukan di file `.env.local` sebelum menjalankan langkah-langkah ini.

## Struktur Proyek

- `app/`: Berisi komponen dan halaman Next.js
- `components/`: Komponen React yang dapat digunakan kembali
- `lib/`: Utilitas dan fungsi helper

## Teknologi yang Digunakan

- Next.js 14
- React 18
- Tailwind CSS
- Supabase (untuk autentikasi dan database)
- Shadcn UI (komponen UI)