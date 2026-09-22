const fs = require('fs');
const path = require('path');

// Ścieżka do pliku z danymi quizów w katalogu projektu
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'quizzes.json');

// Domyślny quiz utworzony tylko przy pierwszym uruchomieniu, gdy plik jeszcze nie istnieje
const DEFAULT_QUIZZES = [
  {
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
  }
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Sprawdzamy, czy plik już istnieje. Jeśli nie istnieje - tworzymy go z domyślnym quizem.
  // Jeśli już istnieje (nawet gdy użytkownik usunie wszystkie quizy), NIE dodajemy domyślnego quizu ponownie.
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_QUIZZES, null, 2), 'utf-8');
    return DEFAULT_QUIZZES;
  }

  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error('Błąd odczytu pliku quizzes.json:', err);
    return [];
  }
}

function getQuizzes() {
  return ensureDataFile();
}

function saveQuizzes(quizzes) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(quizzes, null, 2), 'utf-8');
  return { success: true };
}

module.exports = {
  getQuizzes,
  saveQuizzes,
  DATA_FILE
};
