const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { Client } = require("pg");
const QRCode = require("qrcode");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let db = null;
let pgClient = null;

if (dbType === "postgres" || dbType === "postgresql") {
  pgClient = new Client({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || "oopmission",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
  });

  pgClient.connect()
    .then(() => {
      console.log("Connected to PostgreSQL database.");
      initDatabase();
    })
    .catch((err) => console.error("PostgreSQL connection failed:", err.message));
} else {
  db = new sqlite3.Database(path.join(__dirname, "data.db"), (err) => {
    if (err) {
      console.error("Database connection failed:", err.message);
      return;
    }
    console.log("Connected to SQLite database.");
    initDatabase();
  });
}

function initDatabase() {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      nama TEXT NOT NULL,
      kelas TEXT NOT NULL,
      nilai INTEGER NOT NULL,
      jumlah_benar INTEGER NOT NULL,
      jumlah_salah INTEGER NOT NULL,
      waktu_mulai TEXT,
      waktu_selesai TEXT,
      durasi INTEGER,
      tanggal TEXT,
      jawaban TEXT NOT NULL
    )
  `;

  if (dbType === "postgres" || dbType === "postgresql") {
    pgClient.query(tableSql, (err) => {
      if (err) {
        console.error("Failed to initialize Postgres table:", err.message);
      }
    });
    return;
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kelas TEXT NOT NULL,
      nilai INTEGER NOT NULL,
      jumlah_benar INTEGER NOT NULL,
      jumlah_salah INTEGER NOT NULL,
      waktu_mulai TEXT,
      waktu_selesai TEXT,
      durasi INTEGER,
      tanggal TEXT,
      jawaban TEXT NOT NULL
    )
  `);
}

function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Dashboard Guru"');
    return res.status(401).json({ message: "Login required" });
  }

  const encoded = authHeader.split(" ")[1];
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [username, password] = decoded.split(":");
  const expectedUser = process.env.TEACHER_USERNAME || "admin";
  const expectedPass = process.env.TEACHER_PASSWORD || "oopmission123";

  if (username !== expectedUser || password !== expectedPass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Dashboard Guru"');
    return res.status(401).json({ message: "Invalid credentials" });
  }

  next();
}

const questions = [
  {
    id: "q1",
    category: "concept",
    question: "Sebuah class bernama Siswa digunakan sebagai rancangan untuk membuat data siswa. Kemudian dibuat: siswa1 = Siswa(). Dalam konsep OOP, siswa1 merupakan...",
    code: "",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Class",
      B: "Object",
      C: "Attribute",
      D: "Method",
    },
    correctAnswer: "B",
    explanation: "Class adalah rancangan atau blueprint, sedangkan object adalah instance atau contoh dari class. Jadi siswa1 adalah object.",
  },
  {
    id: "q2",
    category: "concept",
    question: "Perhatikan kode berikut: class Siswa: def __init__(self, nama): self.nama = nama def belajar(self): print('Sedang belajar') Bagian __init__ pada kode tersebut merupakan...",
    code: "class Siswa:\n    def __init__(self, nama):\n        self.nama = nama\n\n    def belajar(self):\n        print(\"Sedang belajar\")",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Attribute",
      B: "Constructor",
      C: "Object",
      D: "Method",
    },
    correctAnswer: "B",
    explanation: "__init__ adalah constructor. Constructor dipanggil saat object dibuat dan biasanya digunakan untuk menginisialisasi nilai awal dari object.",
  },
  {
    id: "q3",
    category: "concept",
    question: "Sebuah object Siswa mempunyai: nama, kelas, umur, belajar(). Yang merupakan method adalah...",
    code: "",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "nama",
      B: "kelas",
      C: "umur",
      D: "belajar()",
    },
    correctAnswer: "D",
    explanation: "Method adalah perilaku atau fungsi yang dimiliki object. Dalam contoh, belajar() adalah method, sedangkan nama, kelas, dan umur adalah attribute.",
  },
  {
    id: "q4",
    category: "code",
    question: "Perhatikan potongan kode berikut: class Kucing: def suara(self): return 'Meong' class Anjing: def suara(self): return 'Guk guk' Keduanya memiliki method yang sama, tetapi hasilnya berbeda. Konsep ini disebut...",
    code: "class Kucing:\n    def suara(self):\n        return 'Meong'\n\nclass Anjing:\n    def suara(self):\n        return 'Guk guk'",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Class",
      B: "Attribute",
      C: "Inheritance",
      D: "Polymorphism",
    },
    correctAnswer: "D",
    explanation: "Polymorphism adalah kemampuan method dengan nama yang sama tetapi perilaku yang bisa berbeda pada object yang berbeda.",
  },
  {
    id: "q5",
    category: "code",
    question: "Perhatikan kode berikut: class Buku: def __init__(self, judul): self.judul = judul b1 = Buku('Pemrograman') Manakah yang merupakan object pada kode di atas?",
    code: "class Buku:\n    def __init__(self, judul):\n        self.judul = judul\n\n b1 = Buku('Pemrograman')",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Buku",
      B: "judul",
      C: "b1",
      D: "__init__",
    },
    correctAnswer: "C",
    explanation: "b1 adalah object hasil instansiasi dari class Buku. Class adalah blueprint, sedangkan object adalah instance dari class.",
  },
  {
    id: "q6",
    category: "code",
    question: "Diketahui class Mobil memiliki attribute warna dan method maju(). Jika kita membuat object mobil1 = Mobil(), maka warna dan maju() termasuk dalam...",
    code: "class Mobil:\n    def __init__(self):\n        self.warna = 'merah'\n    def maju(self):\n        print('Mobil bergerak')",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Attribute dan constructor",
      B: "Attribute dan method",
      C: "Method dan inheritance",
      D: "Object dan method",
    },
    correctAnswer: "B",
    explanation: "warna adalah attribute, sedangkan maju() adalah method. Keduanya adalah bagian dari fitur class dan object.",
  },
  {
    id: "q7",
    category: "object",
    question: "Dalam class Robot, terdapat attribute nama dan method bersihkan(). Kode berikut yang menunjukkan pengaksesan attribute adalah...",
    code: "class Robot:\n    def __init__(self, nama):\n        self.nama = nama\n    def bersihkan(self):\n        print('Membersihkan')",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Robot.nama",
      B: "bersihkan()",
      C: "print('Membersihkan')",
      D: "class Robot",
    },
    correctAnswer: "A",
    explanation: "Robot.nama menunjukkan attribute nama yang dimiliki oleh class atau object. Sedangkan bersihkan() adalah method.",
  },
  {
    id: "q8",
    category: "object",
    question: "Pada class Siswa, kita menulis: self.kelas = 'XI RPL'. Pernyataan tersebut berarti...",
    code: "class Siswa:\n    def __init__(self):\n        self.kelas = 'XI RPL'",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Membuat method baru",
      B: "Membuat attribute kelas",
      C: "Menghapus class",
      D: "Membuat constructor baru",
    },
    correctAnswer: "B",
    explanation: "self.kelas = 'XI RPL' berarti object Siswa memiliki attribute kelas dengan nilai XI RPL.",
  },
  {
    id: "q9",
    category: "object",
    question: "Manakah pernyataan yang benar tentang object?",
    code: "",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Object adalah blueprint dari class",
      B: "Object adalah instance dari class",
      C: "Object adalah nama dari method",
      D: "Object tidak bisa menyimpan data",
    },
    correctAnswer: "B",
    explanation: "Object adalah instance atau bentuk konkret dari class. Class adalah rancangan, sementara object adalah hasil dari rancangan tersebut.",
  },
  {
    id: "q10",
    category: "inheritance",
    question: "Perhatikan kode berikut: class Hewan: def bergerak(self): print('Bergerak') class Kucing(Hewan): pass Kucing merupakan...",
    code: "class Hewan:\n    def bergerak(self):\n        print('Bergerak')\n\nclass Kucing(Hewan):\n    pass",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Parent class",
      B: "Child class",
      C: "Attribute",
      D: "Method",
    },
    correctAnswer: "B",
    explanation: "Kucing adalah child class atau subclass karena mewarisi sifat dari Hewan. Hewan adalah parent class atau superclass.",
  },
  {
    id: "q11",
    category: "inheritance",
    question: "Manfaat utama dari inheritance adalah...",
    code: "",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Membuat class baru tanpa kode",
      B: "Memungkinkan class baru mewarisi sifat dan perilaku class lain",
      C: "Menghapus attribute dari class lama",
      D: "Mengubah object menjadi class",
    },
    correctAnswer: "B",
    explanation: "Inheritance memungkinkan class baru menerima atau mewarisi attribute dan method dari class induknya, sehingga kode lebih reusable dan efisien.",
  },
  {
    id: "q12",
    category: "inheritance",
    question: "Jika class Mobil mewarisi class Kendaraan, maka Mobil dapat menggunakan method dari Kendaraan. Konsep ini disebut...",
    code: "class Kendaraan:\n    def maju(self):\n        print('Berjalan')\n\nclass Mobil(Kendaraan):\n    pass",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Encapsulation",
      B: "Inheritance",
      C: "Polymorphism",
      D: "Constructor",
    },
    correctAnswer: "B",
    explanation: "Karena Mobil memperoleh sifat dan perilaku dari Kendaraan, ini adalah konsep inheritance.",
  },
  {
    id: "q13",
    category: "final",
    question: "Diketahui class Laptop: def __init__(self, merk): self.merk = merk l1 = Laptop('Asus') Jika kita ingin menampilkan merk laptop, cara yang benar adalah...",
    code: "class Laptop:\n    def __init__(self, merk):\n        self.merk = merk\n\nl1 = Laptop('Asus')",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "print(Laptop.merk)",
      B: "print(l1.merk)",
      C: "print(merk)",
      D: "print(self.merk)",
    },
    correctAnswer: "B",
    explanation: "Untuk mengakses attribute dari object, kita gunakan nama object lalu tanda titik, misalnya l1.merk. self hanya digunakan di dalam class.",
  },
  {
    id: "q14",
    category: "final",
    question: "Perhatikan kode berikut: class Hewan: def suara(self): return 'Suara hewan' class Kucing(Hewan): def suara(self): return 'Meong' Jika dibuat obj = Kucing(), maka obj.suara() akan menghasilkan...",
    code: "class Hewan:\n    def suara(self):\n        return 'Suara hewan'\n\nclass Kucing(Hewan):\n    def suara(self):\n        return 'Meong'\n\nobj = Kucing()",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Suara hewan",
      B: "Meong",
      C: "Kucing",
      D: "Error",
    },
    correctAnswer: "B",
    explanation: "Method suara() di class Kucing menimpa method yang ada di parent class Hewan. Karena obj adalah object Kucing, maka method yang dipanggil adalah yang ada di Kucing, yaitu Meong.",
  },
  {
    id: "q15",
    category: "final",
    question: "Pada OOP, class digunakan untuk...",
    code: "",
    options: ["A", "B", "C", "D"],
    answerText: {
      A: "Menyimpan hasil dari object",
      B: "Membuat blueprint atau rancangan untuk object",
      C: "Menjalankan program tanpa struktur",
      D: "Menghapus data object",
    },
    correctAnswer: "B",
    explanation: "Class berfungsi sebagai blueprint atau rancangan yang digunakan untuk membuat object. Object sendiri adalah hasil dari class tersebut.",
  },
];

app.get("/api/questions", (req, res) => {
  res.json(questions);
});

app.post("/api/results", (req, res) => {
  const {
    studentName,
    className,
    answers,
    startedAt,
    finishedAt,
    durationSeconds,
    correctCount,
    wrongCount,
  } = req.body;

  if (!studentName || !className || !answers) {
    return res.status(400).json({ message: "Data siswa tidak lengkap" });
  }

  const total = questions.length;
  const score = Math.round((correctCount / total) * 100);
  const finalizedAnswers = JSON.stringify(answers || {});

  const statement = `
    INSERT INTO results (nama, kelas, nilai, jumlah_benar, jumlah_salah, waktu_mulai, waktu_selesai, durasi, tanggal, jawaban)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  if (dbType === "postgres" || dbType === "postgresql") {
    const insertSql = `
      INSERT INTO results (nama, kelas, nilai, jumlah_benar, jumlah_salah, waktu_mulai, waktu_selesai, durasi, tanggal, jawaban)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    pgClient.query(insertSql, [studentName, className, score, correctCount, wrongCount, startedAt, finishedAt, durationSeconds, new Date().toISOString(), finalizedAnswers], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal menyimpan hasil" });
      }

      return res.status(201).json({
        id: result.rows[0].id,
        nama: studentName,
        kelas: className,
        nilai: score,
        jumlah_benar: correctCount,
        jumlah_salah: wrongCount,
        durasi: formatDuration(durationSeconds),
        tanggal: new Date().toISOString(),
        answers,
        studentName,
        className,
        score,
        correctCount,
        wrongCount,
      });
    });
    return;
  }

  db.run(
    statement,
    [
      studentName,
      className,
      score,
      correctCount,
      wrongCount,
      startedAt,
      finishedAt,
      durationSeconds,
      new Date().toISOString(),
      finalizedAnswers,
    ],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal menyimpan hasil" });
      }

      return res.status(201).json({
        id: this.lastID,
        nama: studentName,
        kelas: className,
        nilai: score,
        jumlah_benar: correctCount,
        jumlah_salah: wrongCount,
        durasi: formatDuration(durationSeconds),
        tanggal: new Date().toISOString(),
        answers,
        studentName,
        className,
        score,
        correctCount,
        wrongCount,
      });
    }
  );
});

app.get("/api/teacher/results", basicAuth, (req, res) => {
  const query = `
    SELECT id, nama, kelas, nilai, jumlah_benar, jumlah_salah, durasi, tanggal
    FROM results
    ORDER BY tanggal DESC
  `;

  if (dbType === "postgres" || dbType === "postgresql") {
    pgClient.query(query, [], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Gagal mengambil data hasil" });
      }

      const mapped = result.rows.map((row) => ({
        ...row,
        durasi: row.durasi ? formatDuration(Number(row.durasi)) : "00:00",
      }));

      return res.json(mapped);
    });
    return;
  }

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Gagal mengambil data hasil" });
    }

    const mapped = rows.map((row) => ({
      ...row,
      durasi: row.durasi ? formatDuration(Number(row.durasi)) : "00:00",
    }));

    return res.json(mapped);
  });
});

app.get("/api/results/:id", basicAuth, (req, res) => {
  const { id } = req.params;

  if (dbType === "postgres" || dbType === "postgresql") {
    pgClient.query(`SELECT * FROM results WHERE id = $1`, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Gagal mengambil detail siswa" });
      }

      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ message: "Siswa tidak ditemukan" });
      }

      const decodedAnswers = JSON.parse(row.jawaban || "{}");
      return res.json({
        id: row.id,
        nama: row.nama,
        kelas: row.kelas,
        nilai: row.nilai,
        jumlah_benar: row.jumlah_benar,
        jumlah_salah: row.jumlah_salah,
        durasi: row.durasi ? formatDuration(Number(row.durasi)) : "00:00",
        tanggal: row.tanggal,
        answers: decodedAnswers,
      });
    });
    return;
  }

  db.get(`SELECT * FROM results WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Gagal mengambil detail siswa" });
    }

    if (!row) {
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    }

    const decodedAnswers = JSON.parse(row.jawaban || "{}");
    res.json({
      id: row.id,
      nama: row.nama,
      kelas: row.kelas,
      nilai: row.nilai,
      jumlah_benar: row.jumlah_benar,
      jumlah_salah: row.jumlah_salah,
      durasi: row.durasi ? formatDuration(Number(row.durasi)) : "00:00",
      tanggal: row.tanggal,
      answers: decodedAnswers,
    });
  });
});

app.post("/api/teacher/login", (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.TEACHER_USERNAME || "admin";
  const expectedPass = process.env.TEACHER_PASSWORD || "oopmission123";

  if (username === expectedUser && password === expectedPass) {
    return res.json({ ok: true, message: "Login berhasil" });
  }

  return res.status(401).json({ message: "Username atau password salah" });
});

app.get("/api/qr-code", async (req, res) => {
  try {
    const url = publicUrl;
    const image = await QRCode.toDataURL(url);
    res.json({ url, image });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal membuat QR code" });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "OOP MISSION server is running" });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Public URL for QR: ${publicUrl}`);
});

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
