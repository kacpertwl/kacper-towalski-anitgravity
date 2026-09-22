const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  isElectron: true,
  getQuizzes: () => ipcRenderer.invoke('get-quizzes'),
  saveQuizzes: (quizzes) => ipcRenderer.invoke('save-quizzes', quizzes)
});
