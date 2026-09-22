/**
 * QuizApp Desktop — Główna logika interfejsu aplikacji w języku polskim
 */

// Stan globalny aplikacji
const state = {
  quizzes: [],
  currentQuiz: null,
  editingQuestionIndex: null,
  quizPendingDeleteId: null,
  questionPendingDeleteIndex: null,
  // Stan sesji rozwiązywania quizu
  player: {
    quiz: null,
    currentQuestionIndex: 0,
    answers: [], // Indeksy odpowiedzi wybranych przez użytkownika
    isFinished: false
  }
};

// Domyślny quiz startowy (używany TYLKO przy pierwszym uruchomieniu, jeśli brak danych)
const SEED_DEFAULT_QUIZ = {
  id: 'quiz-startowy-1',
  title: 'Quiz wiedzy ogólnej — wersja startowa',
  createdAt: new Date().toISOString(),
  questions: [
    {
      id: 'q-1',
      question: 'Jaka jest stolica Polski?',
      answers: [
        'Kraków',
        'Warszawa',
        'Gdańsk'
      ],
      correctAnswer: 1 // Warszawa
    },
    {
      id: 'q-2',
      question: 'Ile planet liczy Układ Słoneczny?',
      answers: [
        '7 planet',
        '8 planet',
        '9 planet'
      ],
      correctAnswer: 1 // 8 planet
    },
    {
      id: 'q-3',
      question: 'Który pierwiastek chemiczny ma symbol „O”?',
      answers: [
        'Złoto',
        'Ołów',
        'Tlen'
      ],
      correctAnswer: 2 // Tlen
    }
  ]
};

/* ==========================================================================
   KOMUNIKACJA Z WARSTWĄ DANYCH (IPC / API / LOCAL STORAGE)
   ========================================================================== */

async function apiGetQuizzes() {
  // 1. Sprawdź kanał Electron IPC
  if (window.api && typeof window.api.getQuizzes === 'function') {
    try {
      return await window.api.getQuizzes();
    } catch (err) {
      console.error('Błąd IPC getQuizzes:', err);
    }
  }

  // 2. Sprawdź lokalny serwer HTTP (desktop-runner)
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Serwer HTTP niedostępny, przechodzę na localStorage:', err);
    }
  }

  // 3. Fallback: localStorage w przeglądarce
  const isInitialized = localStorage.getItem('quizapp_has_run_before');
  const stored = localStorage.getItem('quizapp_quizzes');

  if (!isInitialized) {
    localStorage.setItem('quizapp_has_run_before', 'true');
    const initialData = [SEED_DEFAULT_QUIZ];
    localStorage.setItem('quizapp_quizzes', JSON.stringify(initialData));
    return initialData;
  }

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  return [];
}

async function apiSaveQuizzes(quizzes) {
  // 1. Sprawdź kanał Electron IPC
  if (window.api && typeof window.api.saveQuizzes === 'function') {
    try {
      await window.api.saveQuizzes(quizzes);
      return true;
    } catch (err) {
      console.error('Błąd IPC saveQuizzes:', err);
    }
  }

  // 2. Sprawdź lokalny serwer HTTP
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(quizzes)
      });
      if (res.ok) return true;
    } catch (err) {
      console.warn('Serwer HTTP nie zapisał danych, zapisuję w localStorage:', err);
    }
  }

  // 3. Fallback: localStorage
  localStorage.setItem('quizapp_has_run_before', 'true');
  localStorage.setItem('quizapp_quizzes', JSON.stringify(quizzes));
  return true;
}

/* ==========================================================================
   ZARZĄDZANIE WIDOKAMI I MODALAMI
   ========================================================================== */

function showView(viewId) {
  const views = document.querySelectorAll('.view');
  views.forEach(v => {
    v.classList.remove('active');
    v.classList.add('hidden');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
    targetView.classList.add('active');
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2800);
}

/* ==========================================================================
   WIDOK 1: LISTA QUIZÓW (EKRAN GŁÓWNY)
   ========================================================================== */

async function loadAndRenderQuizzes() {
  state.quizzes = await apiGetQuizzes();
  renderQuizzesList();
}

function renderQuizzesList() {
  const grid = document.getElementById('quizzes-grid');
  const emptyState = document.getElementById('quizzes-empty-state');
  const counterBadge = document.getElementById('quizzes-counter');

  grid.innerHTML = '';
  const count = state.quizzes.length;

  counterBadge.textContent = `Liczba quizów: ${count}`;

  if (count === 0) {
    emptyState.classList.remove('hidden');
    grid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  grid.classList.remove('hidden');

  state.quizzes.forEach(quiz => {
    const qCount = quiz.questions ? quiz.questions.length : 0;
    let questionsText = `${qCount} pytań`;
    if (qCount === 1) questionsText = '1 pytanie';
    else if (qCount >= 2 && qCount <= 4) questionsText = `${qCount} pytania`;

    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="quiz-card-header">
        <div class="quiz-card-top-row">
          <span class="quiz-badge-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            ${questionsText}
          </span>
        </div>
        <h2 class="quiz-card-title">${escapeHtml(quiz.title)}</h2>
      </div>

      <div class="quiz-card-actions">
        <button class="btn btn-primary btn-start" data-id="${quiz.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Rozpocznij</span>
        </button>
        <button class="btn btn-secondary btn-edit" data-id="${quiz.id}" title="Edytuj quiz i pytania">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          <span>Edytuj</span>
        </button>
        <button class="btn btn-outline-danger btn-delete" data-id="${quiz.id}" title="Usuń ten quiz">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>Usuń</span>
        </button>
      </div>
    `;

    // Akcje przycisków karty quizu
    card.querySelector('.btn-start').addEventListener('click', () => {
      startQuiz(quiz.id);
    });

    card.querySelector('.btn-edit').addEventListener('click', () => {
      openQuizEditor(quiz.id);
    });

    card.querySelector('.btn-delete').addEventListener('click', () => {
      confirmDeleteQuiz(quiz.id, quiz.title);
    });

    grid.appendChild(card);
  });
}

/* ==========================================================================
   TWORZENIE NOWEGO QUIZU
   ========================================================================== */

function openNewQuizModal() {
  const input = document.getElementById('input-new-quiz-title');
  const errorBox = document.getElementById('new-quiz-error');
  input.value = '';
  errorBox.classList.add('hidden');
  errorBox.textContent = '';
  openModal('modal-new-quiz');
  setTimeout(() => input.focus(), 80);
}

function handleConfirmNewQuiz() {
  const input = document.getElementById('input-new-quiz-title');
  const errorBox = document.getElementById('new-quiz-error');
  const title = input.value.trim();

  if (!title) {
    errorBox.textContent = 'Proszę podać nazwę nowego quizu.';
    errorBox.classList.remove('hidden');
    input.focus();
    return;
  }

  const newQuiz = {
    id: 'quiz_' + Date.now(),
    title: title,
    createdAt: new Date().toISOString(),
    questions: []
  };

  state.quizzes.push(newQuiz);
  apiSaveQuizzes(state.quizzes);
  closeModal('modal-new-quiz');
  showToast(`Utworzono quiz „${title}”`, 'success');

  // Przejdź od razu do edytora, aby użytkownik mógł dodać pytania
  openQuizEditor(newQuiz.id);
}

/* ==========================================================================
   USUWANIE QUIZU
   ========================================================================== */

function confirmDeleteQuiz(quizId, quizTitle) {
  state.quizPendingDeleteId = quizId;
  const msgEl = document.getElementById('modal-confirm-message');
  const titleEl = document.getElementById('modal-confirm-title');

  titleEl.textContent = 'Usuwanie quizu';
  msgEl.innerHTML = `Czy na pewno chcesz usunąć quiz <strong>„${escapeHtml(quizTitle)}”</strong>?<br><span style="color:#ef4444; font-size:0.85rem; margin-top:8px; display:inline-block;">Ta operacja trwale usunie wszystkie przypisane do niego pytania.</span>`;

  const confirmBtn = document.getElementById('btn-confirm-action');
  confirmBtn.onclick = () => {
    deleteQuiz(state.quizPendingDeleteId);
    closeModal('modal-confirm');
  };

  openModal('modal-confirm');
}

async function deleteQuiz(quizId) {
  state.quizzes = state.quizzes.filter(q => q.id !== quizId);
  await apiSaveQuizzes(state.quizzes);
  showToast('Quiz został pomyślnie usunięty', 'info');
  renderQuizzesList();
}

/* ==========================================================================
   WIDOK 2: EDYTOR QUIZU I PYTAŃ
   ========================================================================== */

function openQuizEditor(quizId) {
  const quiz = state.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    showToast('Nie znaleziono wybranego quizu', 'error');
    return;
  }

  // Używamy kopii do edycji
  state.currentQuiz = JSON.parse(JSON.stringify(quiz));
  state.editingQuestionIndex = null;

  document.getElementById('editor-quiz-title').value = state.currentQuiz.title;
  renderEditorQuestionsList();

  showView('view-quiz-editor');
}

function renderEditorQuestionsList() {
  const listEl = document.getElementById('editor-questions-list');
  const emptyEl = document.getElementById('editor-questions-empty');
  const badgeEl = document.getElementById('editor-questions-badge');

  listEl.innerHTML = '';
  const questions = state.currentQuiz.questions || [];
  const qCount = questions.length;

  let questionsText = `${qCount} pytań`;
  if (qCount === 1) questionsText = '1 pytanie';
  else if (qCount >= 2 && qCount <= 4) questionsText = `${qCount} pytania`;
  badgeEl.textContent = questionsText;

  if (qCount === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'question-item-card';

    const answersHtml = (q.answers || []).map((ans, aIdx) => {
      const isCorrect = aIdx === q.correctAnswer;
      const letter = ['A', 'B', 'C'][aIdx] || `${aIdx + 1}`;
      return `
        <div class="answer-chip ${isCorrect ? 'is-correct' : ''}">
          <span class="answer-chip-tag">${letter}</span>
          <span>${escapeHtml(ans)}</span>
          ${isCorrect ? '<span style="font-size:0.75rem; margin-left:4px;">(Poprawna)</span>' : ''}
        </div>
      `;
    }).join('');

    item.innerHTML = `
      <div class="question-item-content">
        <h4 class="question-item-title">${idx + 1}. ${escapeHtml(q.question)}</h4>
        <div class="question-item-answers">
          ${answersHtml}
        </div>
      </div>
      <div class="question-item-actions">
        <button class="btn btn-secondary btn-sm btn-edit-question" data-idx="${idx}">
          ✏ Edytuj
        </button>
        <button class="btn btn-outline-danger btn-sm btn-delete-question" data-idx="${idx}">
          🗑 Usuń
        </button>
      </div>
    `;

    item.querySelector('.btn-edit-question').addEventListener('click', () => {
      openQuestionModal(idx);
    });

    item.querySelector('.btn-delete-question').addEventListener('click', () => {
      confirmDeleteQuestion(idx);
    });

    listEl.appendChild(item);
  });
}

async function saveCurrentQuiz() {
  const titleInput = document.getElementById('editor-quiz-title');
  const title = titleInput.value.trim();

  if (!title) {
    showToast('Nazwa quizu nie może być pusta!', 'error');
    titleInput.focus();
    return;
  }

  state.currentQuiz.title = title;

  // Znajdź indeks w globalnej tablicy i zaktualizuj
  const idx = state.quizzes.findIndex(q => q.id === state.currentQuiz.id);
  if (idx !== -1) {
    state.quizzes[idx] = JSON.parse(JSON.stringify(state.currentQuiz));
  } else {
    state.quizzes.push(JSON.parse(JSON.stringify(state.currentQuiz)));
  }

  await apiSaveQuizzes(state.quizzes);
  showToast('Quiz został pomyślnie zapisany', 'success');
  renderQuizzesList();
  showView('view-quizzes-list');
}

/* ==========================================================================
   MODAL DODAWANIA I EDYCJI PYTANIA
   ========================================================================== */

function openQuestionModal(questionIndex = null) {
  state.editingQuestionIndex = questionIndex;
  const modalTitle = document.getElementById('modal-question-title');
  const qTextInput = document.getElementById('input-question-text');
  const a0Input = document.getElementById('input-answer-0');
  const a1Input = document.getElementById('input-answer-1');
  const a2Input = document.getElementById('input-answer-2');
  const errorBox = document.getElementById('question-form-error');

  errorBox.classList.add('hidden');
  errorBox.textContent = '';

  if (questionIndex !== null && state.currentQuiz.questions[questionIndex]) {
    // Tryb edycji pytania
    const q = state.currentQuiz.questions[questionIndex];
    modalTitle.textContent = `Edytuj pytanie ${questionIndex + 1}`;
    qTextInput.value = q.question || '';
    a0Input.value = (q.answers && q.answers[0]) || '';
    a1Input.value = (q.answers && q.answers[1]) || '';
    a2Input.value = (q.answers && q.answers[2]) || '';

    const correct = q.correctAnswer !== undefined ? q.correctAnswer : 0;
    const radio = document.querySelector(`input[name="correct-answer-radio"][value="${correct}"]`);
    if (radio) radio.checked = true;
  } else {
    // Tryb dodawania nowego pytania
    modalTitle.textContent = 'Dodaj nowe pytanie';
    qTextInput.value = '';
    a0Input.value = '';
    a1Input.value = '';
    a2Input.value = '';

    const radio0 = document.querySelector('input[name="correct-answer-radio"][value="0"]');
    if (radio0) radio0.checked = true;
  }

  openModal('modal-question-form');
  setTimeout(() => qTextInput.focus(), 80);
}

function handleSaveQuestion() {
  const qTextInput = document.getElementById('input-question-text');
  const a0Input = document.getElementById('input-answer-0');
  const a1Input = document.getElementById('input-answer-1');
  const a2Input = document.getElementById('input-answer-2');
  const errorBox = document.getElementById('question-form-error');

  const questionText = qTextInput.value.trim();
  const a0 = a0Input.value.trim();
  const a1 = a1Input.value.trim();
  const a2 = a2Input.value.trim();

  const checkedRadio = document.querySelector('input[name="correct-answer-radio"]:checked');
  const correctAnswer = checkedRadio ? parseInt(checkedRadio.value, 10) : 0;

  // Walidacja
  if (!questionText) {
    errorBox.textContent = 'Proszę wpisać treść pytania.';
    errorBox.classList.remove('hidden');
    qTextInput.focus();
    return;
  }

  if (!a0 || !a1 || !a2) {
    errorBox.textContent = 'Pytanie musi posiadać dokładnie trzy uzupełnione odpowiedzi (A, B i C).';
    errorBox.classList.remove('hidden');
    return;
  }

  const questionData = {
    id: state.editingQuestionIndex !== null && state.currentQuiz.questions[state.editingQuestionIndex] 
      ? state.currentQuiz.questions[state.editingQuestionIndex].id 
      : 'q_' + Date.now(),
    question: questionText,
    answers: [a0, a1, a2],
    correctAnswer: correctAnswer
  };

  if (!state.currentQuiz.questions) {
    state.currentQuiz.questions = [];
  }

  if (state.editingQuestionIndex !== null) {
    state.currentQuiz.questions[state.editingQuestionIndex] = questionData;
    showToast('Zaktualizowano pytanie', 'info');
  } else {
    state.currentQuiz.questions.push(questionData);
    showToast('Dodano nowe pytanie', 'success');
  }

  closeModal('modal-question-form');
  renderEditorQuestionsList();
}

function confirmDeleteQuestion(index) {
  state.questionPendingDeleteIndex = index;
  const msgEl = document.getElementById('modal-confirm-message');
  const titleEl = document.getElementById('modal-confirm-title');

  titleEl.textContent = 'Usuwanie pytania';
  msgEl.innerHTML = `Czy na pewno chcesz usunąć pytanie numer <strong>${index + 1}</strong>?`;

  const confirmBtn = document.getElementById('btn-confirm-action');
  confirmBtn.onclick = () => {
    deleteQuestion(state.questionPendingDeleteIndex);
    closeModal('modal-confirm');
  };

  openModal('modal-confirm');
}

function deleteQuestion(index) {
  if (state.currentQuiz && state.currentQuiz.questions) {
    state.currentQuiz.questions.splice(index, 1);
    renderEditorQuestionsList();
    showToast('Pytanie zostało usunięte', 'info');
  }
}

/* ==========================================================================
   WIDOK 3: ROZWIĄZYWANIE QUIZU (TRYB ROZWIĄZYWANIA)
   ========================================================================== */

function startQuiz(quizId) {
  const quiz = state.quizzes.find(q => q.id === quizId);
  if (!quiz) {
    showToast('Nie znaleziono quizu', 'error');
    return;
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    showToast('Ten quiz nie posiada jeszcze pytań. Kliknij „Edytuj”, aby dodać pytania!', 'warning');
    return;
  }

  state.player = {
    quiz: JSON.parse(JSON.stringify(quiz)),
    currentQuestionIndex: 0,
    answers: [],
    isFinished: false
  };

  document.getElementById('player-quiz-title').textContent = quiz.title;
  renderPlayerCurrentQuestion();
  showView('view-quiz-player');
}

function renderPlayerCurrentQuestion() {
  const { quiz, currentQuestionIndex } = state.player;
  const totalQuestions = quiz.questions.length;
  const currentQ = quiz.questions[currentQuestionIndex];

  // Licznik: „Pytanie X z Y”
  const currentNum = currentQuestionIndex + 1;
  document.getElementById('player-step-label').textContent = `Pytanie ${currentNum} z ${totalQuestions}`;
  document.getElementById('player-question-pill').textContent = `Pytanie ${currentNum} z ${totalQuestions}`;

  // Pasek postępu
  const percent = Math.round(((currentQuestionIndex) / totalQuestions) * 100);
  document.getElementById('player-percent-label').textContent = `${percent}%`;
  document.getElementById('player-progress-bar').style.width = `${Math.max(percent, 5)}%`;

  // Treść pytania
  document.getElementById('player-question-text').textContent = currentQ.question;

  // Trzy odpowiedzi
  const letters = ['A', 'B', 'C'];
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById(`btn-answer-${i}`);
    const textSpan = document.getElementById(`answer-text-${i}`);
    btn.classList.remove('selected');
    btn.disabled = false;

    if (currentQ.answers && currentQ.answers[i] !== undefined) {
      textSpan.textContent = currentQ.answers[i];
      btn.style.display = 'flex';
    } else {
      btn.style.display = 'none';
    }
  }
}

function handleAnswerSelection(chosenIndex) {
  const { quiz, currentQuestionIndex } = state.player;
  const currentQ = quiz.questions[currentQuestionIndex];

  // Zablokuj przyciski, aby zapobiec wielokrotnemu kliknięciu
  for (let i = 0; i < 3; i++) {
    const btn = document.getElementById(`btn-answer-${i}`);
    btn.disabled = true;
  }

  // Zaznacz kliknięty przycisk
  const selectedBtn = document.getElementById(`btn-answer-${chosenIndex}`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }

  // Zapisz odpowiedź
  state.player.answers[currentQuestionIndex] = {
    chosenIndex: chosenIndex,
    isCorrect: chosenIndex === currentQ.correctAnswer,
    questionText: currentQ.question,
    answers: currentQ.answers,
    correctAnswer: currentQ.correctAnswer
  };

  // Krótkie opóźnienie dla płynnego odczucia interakcji
  setTimeout(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < quiz.questions.length) {
      state.player.currentQuestionIndex = nextIndex;
      renderPlayerCurrentQuestion();
    } else {
      // Wszystkie pytania zostały rozwiązane
      finishQuiz();
    }
  }, 220);
}

function confirmAbortQuiz() {
  const msgEl = document.getElementById('modal-confirm-message');
  const titleEl = document.getElementById('modal-confirm-title');

  titleEl.textContent = 'Przerwanie quizu';
  msgEl.textContent = 'Czy na pewno chcesz przerwać rozwiązywanie tego quizu i wrócić do listy? Twój obecny postęp nie zostanie zapisany.';

  const confirmBtn = document.getElementById('btn-confirm-action');
  confirmBtn.onclick = () => {
    closeModal('modal-confirm');
    showView('view-quizzes-list');
  };

  openModal('modal-confirm');
}

/* ==========================================================================
   WIDOK 4: EKRAN PODSUMOWANIA WYNIKU
   ========================================================================== */

function finishQuiz() {
  state.player.isFinished = true;
  const { quiz, answers } = state.player;
  const total = quiz.questions.length;

  let correctCount = 0;
  let incorrectCount = 0;

  answers.forEach(ans => {
    if (ans.isCorrect) correctCount++;
    else incorrectCount++;
  });

  const percentScore = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Nagłówek i wynik
  document.getElementById('results-quiz-name').textContent = quiz.title;
  document.getElementById('results-score-display').textContent = `Wynik: ${correctCount}/${total} (${percentScore}%)`;

  // Wiadomość motywacyjna i ikona
  const iconEl = document.getElementById('results-icon');
  const msgEl = document.getElementById('results-message');

  if (percentScore === 100) {
    iconEl.textContent = '🏆';
    msgEl.textContent = 'Genialnie! Odpowiedziałeś poprawnie na wszystkie pytania! Perfekcyjny wynik!';
  } else if (percentScore >= 66) {
    iconEl.textContent = '🎉';
    msgEl.textContent = 'Bardzo dobry wynik! Świetna robota, większość odpowiedzi jest prawidłowa.';
  } else if (percentScore >= 33) {
    iconEl.textContent = '👍';
    msgEl.textContent = 'Niezły wynik! Jeszcze chwila powtórki i osiągniesz 100%.';
  } else {
    iconEl.textContent = '📚';
    msgEl.textContent = 'Warto poćwiczyć jeszcze raz! Kliknij „Spróbuj ponownie”, aby utrwalić wiedzę.';
  }

  // Liczby w statystykach
  document.getElementById('res-correct-count').textContent = correctCount;
  document.getElementById('res-incorrect-count').textContent = incorrectCount;
  document.getElementById('res-total-count').textContent = total;

  // Szczegółowe podsumowanie pytań
  const breakdownList = document.getElementById('results-breakdown-list');
  breakdownList.innerHTML = '';

  answers.forEach((ans, idx) => {
    const item = document.createElement('div');
    item.className = `breakdown-item ${ans.isCorrect ? 'correct' : 'incorrect'}`;

    const letters = ['A', 'B', 'C'];
    const chosenLetter = letters[ans.chosenIndex] || '?';
    const chosenText = ans.answers[ans.chosenIndex] || '';

    const correctLetter = letters[ans.correctAnswer] || '?';
    const correctText = ans.answers[ans.correctAnswer] || '';

    item.innerHTML = `
      <div class="breakdown-q-title">
        ${ans.isCorrect ? '✓' : '✗'} Pytanie ${idx + 1}: ${escapeHtml(ans.questionText)}
      </div>
      <div class="breakdown-q-answers">
        <span class="user-pick ${ans.isCorrect ? 'picked-correct' : 'picked-wrong'}">
          Twoja odpowiedź: ${chosenLetter}) ${escapeHtml(chosenText)} ${ans.isCorrect ? '(Poprawna)' : '(Błędna)'}
        </span>
        ${!ans.isCorrect ? `<span class="correct-reveal">Poprawna odpowiedź: ${correctLetter}) ${escapeHtml(correctText)}</span>` : ''}
      </div>
    `;

    breakdownList.appendChild(item);
  });

  showView('view-quiz-results');
}

function restartCurrentQuiz() {
  if (state.player && state.player.quiz) {
    startQuiz(state.player.quiz.id);
  }
}

/* ==========================================================================
   POMOCNICZE I NASŁUCHIWANIE ZDARZEŃ
   ========================================================================== */

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setupEventListeners() {
  // Nawigacja w nagłówku
  document.getElementById('brand-home').addEventListener('click', () => {
    showView('view-quizzes-list');
  });

  document.getElementById('btn-header-new-quiz').addEventListener('click', () => {
    openNewQuizModal();
  });

  document.getElementById('btn-empty-new-quiz').addEventListener('click', () => {
    openNewQuizModal();
  });

  document.getElementById('btn-header-instruction').addEventListener('click', () => {
    openModal('modal-instruction');
  });

  // Modal instrukcji
  document.getElementById('btn-close-instruction').addEventListener('click', () => {
    closeModal('modal-instruction');
  });
  document.getElementById('btn-ack-instruction').addEventListener('click', () => {
    closeModal('modal-instruction');
  });

  // Modal nowego quizu
  document.getElementById('btn-close-new-quiz-modal').addEventListener('click', () => {
    closeModal('modal-new-quiz');
  });
  document.getElementById('btn-cancel-new-quiz').addEventListener('click', () => {
    closeModal('modal-new-quiz');
  });
  document.getElementById('btn-confirm-new-quiz').addEventListener('click', () => {
    handleConfirmNewQuiz();
  });
  document.getElementById('input-new-quiz-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleConfirmNewQuiz();
  });

  // Edytor quizu
  document.getElementById('btn-editor-back').addEventListener('click', () => {
    renderQuizzesList();
    showView('view-quizzes-list');
  });

  document.getElementById('btn-editor-save-all').addEventListener('click', () => {
    saveCurrentQuiz();
  });

  document.getElementById('btn-add-question').addEventListener('click', () => {
    openQuestionModal(null);
  });

  // Modal pytania
  document.getElementById('btn-close-question-modal').addEventListener('click', () => {
    closeModal('modal-question-form');
  });
  document.getElementById('btn-cancel-question').addEventListener('click', () => {
    closeModal('modal-question-form');
  });
  document.getElementById('btn-save-question').addEventListener('click', () => {
    handleSaveQuestion();
  });

  // Rozwiązywanie quizu - kliknięcia odpowiedzi
  for (let i = 0; i < 3; i++) {
    document.getElementById(`btn-answer-${i}`).addEventListener('click', () => {
      handleAnswerSelection(i);
    });
  }

  // Przerwanie quizu
  document.getElementById('btn-player-abort').addEventListener('click', () => {
    confirmAbortQuiz();
  });

  // Ekran wyników
  document.getElementById('btn-restart-quiz').addEventListener('click', () => {
    restartCurrentQuiz();
  });

  document.getElementById('btn-back-to-quizzes').addEventListener('click', () => {
    renderQuizzesList();
    showView('view-quizzes-list');
  });

  // Modal potwierdzenia
  document.getElementById('btn-close-confirm-modal').addEventListener('click', () => {
    closeModal('modal-confirm');
  });
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    closeModal('modal-confirm');
  });

  // Zamknięcie modali po kliknięciu w tło (backdrop)
  window.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      e.target.classList.add('hidden');
    }
  });

  // Obsługa klawisza Escape do zamykania modali
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop:not(.hidden)');
      openModals.forEach(m => m.classList.add('hidden'));
    }
  });
}

// Inicjalizacja aplikacji po załadowaniu drzewa DOM
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAndRenderQuizzes();
});
