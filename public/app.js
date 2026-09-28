const state = {
  questions: [],
  currentIndex: 0,
  answers: {},
  studentName: "",
  studentClass: "",
  startedAt: null,
  finishedAt: null,
  resultRecord: null,
  teacherResults: [],
  teacherFilter: "all",
  teacherSearch: "",
  teacherAuth: null,
};

const challengeLabels = {
  concept: "CONCEPT CHALLENGE",
  code: "CODE DETECTIVE",
  object: "OBJECT MISSION",
  inheritance: "INHERITANCE CHALLENGE",
  final: "FINAL CHALLENGE",
};

const screenIds = {
  welcome: "welcome-screen",
  quiz: "quiz-screen",
  result: "result-screen",
  review: "review-screen",
  teacherLogin: "teacher-login-screen",
  teacherDashboard: "teacher-dashboard-screen",
  teacherDetail: "teacher-detail-screen",
};

function showScreen(screenId) {
  Object.values(screenIds).forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle("hidden", id !== screenId);
      element.classList.toggle("active", id === screenId);
    }
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getQuestionById(questionId) {
  return state.questions.find((question) => question.id === questionId);
}

function renderProgress() {
  const totalQuestions = state.questions.length || 1;
  const percent = ((state.currentIndex + 1) / totalQuestions) * 100;
  document.getElementById("progress-bar").style.width = `${percent}%`;
  document.getElementById("challenge-index").textContent = `CHALLENGE ${state.currentIndex + 1} / ${state.questions.length}`;
  const currentQuestion = state.questions[state.currentIndex];
  const tag = currentQuestion ? challengeLabels[currentQuestion.category] : "";
  document.getElementById("challenge-tag").textContent = tag;
}

function renderQuestion() {
  const question = state.questions[state.currentIndex];
  if (!question) return;

  const selectedAnswer = state.answers[question.id] || null;
  const optionsMarkup = question.options
    .map((option) => {
      const isSelected = selectedAnswer === option;
      return `
        <button class="choice ${isSelected ? "selected" : ""}" data-option="${option}">
          <span class="choice-letter">${option}</span>
          <span>${option}. ${question.answerText[option]}</span>
        </button>
      `;
    })
    .join("");

  const questionCode = question.code ? `<pre class="question-code">${question.code}</pre>` : "";
  const answerHint = selectedAnswer ? `<div class="answer-hint">Jawaban tersimpan.</div>` : "";

  document.getElementById("question-card").innerHTML = `
    <div class="question-text">${question.question}</div>
    ${questionCode}
    <div class="question-options">${optionsMarkup}</div>
    ${answerHint}
  `;

  document.getElementById("prev-button").style.visibility = state.currentIndex === 0 ? "hidden" : "visible";
  document.getElementById("next-button").textContent = state.currentIndex === state.questions.length - 1 ? "🏁 SELESAI" : "LANJUT ➡️";

  renderProgress();
}

function updateStudentMeta() {
  document.getElementById("quiz-name").textContent = state.studentName;
  document.getElementById("quiz-class").textContent = state.studentClass;
}

function startQuiz(event) {
  event.preventDefault();
  const nameInput = document.getElementById("student-name");
  const classInput = document.getElementById("student-class");

  if (!nameInput.value.trim() || !classInput.value.trim()) {
    showToast("Nama dan kelas wajib diisi!");
    return;
  }

  state.studentName = nameInput.value.trim();
  state.studentClass = classInput.value.trim();
  state.startedAt = new Date().toISOString();
  state.currentIndex = 0;
  state.answers = {};
  state.resultRecord = null;

  updateStudentMeta();
  showScreen(screenIds.quiz);
  renderQuestion();
}

function recordAnswer(selectedOption) {
  const question = state.questions[state.currentIndex];
  if (!question) return;
  state.answers[question.id] = selectedOption;
  renderQuestion();
}

function openFinishModal(type = "finish") {
  const modalOverlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");
  const modalPrimary = document.getElementById("modal-primary");
  const modalSecondary = document.getElementById("modal-secondary");

  if (type === "finish") {
    const unanswered = state.questions.filter((item) => !state.answers[item.id]).length;
    const message = unanswered
      ? `<strong>Masih ada soal yang belum dijawab.</strong><br> Kamu belum menjawab ${unanswered} soal.<br>Jawaban yang sudah dipilih akan digunakan untuk menghitung nilai.`
      : "<strong>Apakah kamu yakin ingin menyelesaikan kuis?</strong><br>Terdapat 15 soal.<br>Jawaban yang sudah dipilih akan digunakan untuk menghitung nilai.";

    modalTitle.textContent = unanswered ? "⚠️ Masih ada soal yang belum dijawab" : "Apakah kamu yakin ingin menyelesaikan kuis?";
    modalMessage.innerHTML = message;
    modalPrimary.textContent = unanswered ? "TETAP SUBMIT" : "✓ YA, SELESAIKAN KUIS";
    modalSecondary.textContent = "← KEMBALI";
    modalPrimary.onclick = () => { modalOverlay.classList.add("hidden"); submitQuiz(); };
    modalSecondary.onclick = () => modalOverlay.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
    return;
  }

  modalTitle.textContent = "Apakah kamu yakin ingin menyelesaikan kuis?";
  modalMessage.innerHTML = "<strong>Terdapat 15 soal.</strong><br>Jawaban yang sudah dipilih akan digunakan untuk menghitung nilai.";
  modalPrimary.textContent = "✓ YA, SELESAIKAN KUIS";
  modalSecondary.textContent = "← KEMBALI";
  modalPrimary.onclick = () => { modalOverlay.classList.add("hidden"); submitQuiz(); };
  modalSecondary.onclick = () => modalOverlay.classList.add("hidden");
  modalOverlay.classList.remove("hidden");
}

async function submitQuiz() {
  const totalQuestions = state.questions.length;
  const correctCount = state.questions.filter((question) => state.answers[question.id] === question.correctAnswer).length;
  const wrongCount = totalQuestions - correctCount;
  const finishedAt = new Date().toISOString();
  const startedAt = new Date(state.startedAt);
  const finished = new Date(finishedAt);
  const durationSeconds = Math.max(0, Math.round((finished - startedAt) / 1000));

  const payload = {
    studentName: state.studentName,
    className: state.studentClass,
    answers: state.answers,
    startedAt: state.startedAt,
    finishedAt,
    durationSeconds,
    correctCount,
    wrongCount,
  };

  try {
    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Gagal menyimpan hasil kuis");
    }

    const result = await response.json();
    state.resultRecord = result;
    renderResultScreen();
    showScreen(screenIds.result);
  } catch (error) {
    showToast(error.message || "Terjadi kesalahan saat submit");
  }
}

function renderResultScreen() {
  const { score, correctCount, wrongCount, studentName, className } = state.resultRecord || {};
  document.getElementById("result-name").textContent = studentName || state.studentName;
  document.getElementById("result-class").textContent = className || state.studentClass;
  document.getElementById("result-score").textContent = score ?? 0;
  document.getElementById("result-correct").textContent = `${correctCount ?? 0} / ${state.questions.length}`;
  document.getElementById("result-wrong").textContent = `${wrongCount ?? 0} / ${state.questions.length}`;

  const scoreNumber = Number(score ?? 0);
  let message = "💡 Yuk pelajari kembali materi OOP dan pahami konsep dasarnya.";
  if (scoreNumber >= 80) {
    message = "🔥 Mantap! Pemahaman materi kamu sudah bagus.";
  } else if (scoreNumber >= 60) {
    message = "👍 Sudah cukup baik. Coba perhatikan kembali beberapa konsep yang masih keliru.";
  }
  document.getElementById("result-message").textContent = message;
}

function renderReviewScreen() {
  const reviewContent = document.getElementById("review-content");
  reviewContent.innerHTML = state.questions
    .map((question, index) => {
      const selectedAnswer = state.answers[question.id] || "Belum dijawab";
      const isCorrect = selectedAnswer === question.correctAnswer;
      const status = isCorrect ? "BENAR" : "SALAH";
      const statusClass = isCorrect ? "correct" : "wrong";

      return `
        <article class="review-item">
          <div class="question-head">
            <h3>Soal ${index + 1}</h3>
            <span class="status-pill ${statusClass}">${status}</span>
          </div>
          <div class="review-question"><strong>Pertanyaan:</strong> ${question.question}</div>
          <div class="review-answer"><strong>Jawaban siswa:</strong> ${selectedAnswer === "Belum dijawab" ? "Belum dijawab" : selectedAnswer}</div>
          <div class="review-answer"><strong>Jawaban benar:</strong> ${question.correctAnswer}</div>
          <div class="review-explanation"><strong>Penjelasan:</strong> ${question.explanation}</div>
        </article>
      `;
    })
    .join("");
}

function renderTeacherDashboard() {
  const rows = state.teacherResults;
  const filtered = rows.filter((row) => {
    const searchMatch = row.nama.toLowerCase().includes(state.teacherSearch.toLowerCase());
    const classMatch = state.teacherFilter === "all" || row.kelas === state.teacherFilter;
    return searchMatch && classMatch;
  });

  const tbody = document.getElementById("teacher-results-body");
  tbody.innerHTML = filtered
    .map((row, index) => `
      <tr class="clickable" data-id="${row.id}">
        <td>${index + 1}</td>
        <td>${row.nama}</td>
        <td>${row.kelas}</td>
        <td>${row.jumlah_benar}</td>
        <td>${row.jumlah_salah}</td>
        <td>${row.nilai}</td>
        <td>${row.durasi}</td>
        <td>${new Date(row.tanggal).toLocaleDateString("id-ID")}</td>
      </tr>
    `)
    .join("");

  tbody.querySelectorAll("tr[data-id]").forEach((rowElement) => {
    rowElement.addEventListener("click", async () => {
      const id = Number(rowElement.dataset.id);
      await openTeacherDetail(id);
    });
  });

  const filterSelect = document.getElementById("teacher-filter");
  const classes = [...new Set(rows.map((row) => row.kelas))].sort();
  filterSelect.innerHTML = `<option value="all">Semua kelas</option>${classes
    .map((kelas) => `<option value="${kelas}">${kelas}</option>`)
    .join("")}`;
  filterSelect.value = state.teacherFilter;
}

async function loadTeacherResults() {
  if (!state.teacherAuth) return;

  try {
    const response = await fetch("/api/teacher/results", {
      headers: {
        Authorization: `Basic ${btoa(`${state.teacherAuth.username}:${state.teacherAuth.password}`)}`,
      },
    });

    if (!response.ok) throw new Error("Akses dashboard ditolak");
    const results = await response.json();
    state.teacherResults = results;
    renderTeacherDashboard();
    await loadQrCode();
  } catch (error) {
    showToast(error.message || "Tidak dapat memuat data guru");
  }
}

async function loadQrCode() {
  try {
    const response = await fetch("/api/qr-code");
    if (!response.ok) throw new Error("Gagal memuat QR code");
    const data = await response.json();
    document.getElementById("public-url-text").textContent = data.url;
    document.getElementById("qr-code-image").src = data.image;
  } catch (error) {
    document.getElementById("public-url-text").textContent = "Setel PUBLIC_URL pada environment untuk QR Code publik.";
    document.getElementById("qr-code-image").src = "";
  }
}

async function openTeacherDetail(id) {
  try {
    const response = await fetch(`/api/results/${id}`, {
      headers: {
        Authorization: `Basic ${btoa(`${state.teacherAuth.username}:${state.teacherAuth.password}`)}`,
      },
    });

    if (!response.ok) throw new Error("Data siswa tidak ditemukan");
    const result = await response.json();

    const detailName = document.getElementById("detail-name");
    detailName.textContent = result.nama;

    const summary = document.getElementById("detail-summary");
    const totalQuestions = state.questions.length;
    summary.innerHTML = `
      <div class="detail-summary-grid">
        <div class="detail-summary-item">
          <span>Nama</span>
          <strong>${result.nama}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Kelas</span>
          <strong>${result.kelas}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Nilai</span>
          <strong>${result.nilai}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Benar</span>
          <strong>${result.jumlah_benar}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Salah</span>
          <strong>${result.jumlah_salah}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Durasi</span>
          <strong>${result.durasi}</strong>
        </div>
        <div class="detail-summary-item">
          <span>Tanggal</span>
          <strong>${new Date(result.tanggal).toLocaleDateString("id-ID")}</strong>
        </div>
      </div>
    `;

    const detailQuestions = document.getElementById("detail-questions");
    detailQuestions.innerHTML = state.questions
      .map((question, index) => {
        const selected = result.answers?.[question.id] || "Belum dijawab";
        const isCorrect = selected === question.correctAnswer;
        const mark = isCorrect ? "✓" : "✗";
        const status = isCorrect ? "Benar" : "Salah";

        return `
          <div class="detail-question-item">
            <div>
              <strong>Soal ${index + 1}</strong>
              <div>${question.question}</div>
            </div>
            <div class="detail-meta">
              <div class="icon">${mark}</div>
              <div>${status}</div>
            </div>
          </div>
        `;
      })
      .join("");

    showScreen(screenIds.teacherDetail);
  } catch (error) {
    showToast(error.message || "Gagal membuka detail siswa");
  }
}

async function loginTeacher(event) {
  event.preventDefault();
  const username = document.getElementById("teacher-username").value.trim();
  const password = document.getElementById("teacher-password").value.trim();

  try {
    const response = await fetch("/api/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Username atau password salah");
    }

    state.teacherAuth = { username, password };
    showScreen(screenIds.teacherDashboard);
    await loadTeacherResults();
  } catch (error) {
    showToast(error.message || "Login gagal");
  }
}

function logoutTeacher() {
  state.teacherAuth = null;
  document.getElementById("teacher-login-form").reset();
  showScreen(screenIds.teacherLogin);
}

function applyTeacherFilters() {
  state.teacherSearch = document.getElementById("teacher-search").value.trim();
  state.teacherFilter = document.getElementById("teacher-filter").value;
  renderTeacherDashboard();
}

async function initApp() {
  try {
    const response = await fetch("/api/questions");
    if (!response.ok) throw new Error("Gagal memuat soal");
    const questions = await response.json();
    state.questions = questions;
  } catch (error) {
    showToast(error.message || "Aplikasi gagal memuat soal");
  }

  document.getElementById("student-form").addEventListener("submit", startQuiz);
  document.getElementById("teacher-login-button").addEventListener("click", () => showScreen(screenIds.teacherLogin));
  document.getElementById("teacher-login-form").addEventListener("submit", loginTeacher);
  document.getElementById("logout-teacher").addEventListener("click", logoutTeacher);
  document.getElementById("back-to-home").addEventListener("click", () => {
    showScreen(screenIds.welcome);
  });
  document.getElementById("show-review-button").addEventListener("click", () => {
    renderReviewScreen();
    showScreen(screenIds.review);
  });
  document.getElementById("back-to-dashboard").addEventListener("click", () => {
    showScreen(screenIds.teacherDashboard);
  });
  document.getElementById("teacher-search").addEventListener("input", applyTeacherFilters);
  document.getElementById("teacher-filter").addEventListener("change", applyTeacherFilters);
  document.getElementById("download-qr-button").addEventListener("click", () => {
    const img = document.getElementById("qr-code-image");
    if (!img || !img.src) {
      showToast("QR code belum tersedia");
      return;
    }

    const link = document.createElement("a");
    link.href = img.src;
    link.download = "oop-mission-qr-code.png";
    link.click();
  });

  document.getElementById("prev-button").addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
    }
  });

  document.getElementById("next-button").addEventListener("click", () => {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      return;
    }

    openFinishModal("finish");
  });

  document.getElementById("question-card").addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    recordAnswer(button.dataset.option);
  });

  showScreen(screenIds.welcome);
  renderQuestion();
}

window.addEventListener("DOMContentLoaded", initApp);
