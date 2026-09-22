const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const storage = require('./storage');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 880,
    minHeight: 650,
    title: 'QuizApp Desktop — Twoje Quizy',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Usunięcie domyślnego paska menu dla nowoczesnego, czystego wyglądu aplikacji
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Rejestracja kanałów komunikacji IPC
ipcMain.handle('get-quizzes', async () => {
  return storage.getQuizzes();
});

ipcMain.handle('save-quizzes', async (event, quizzes) => {
  return storage.saveQuizzes(quizzes);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
