const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Assumes you have a favicon in public folder
    icon: path.join(__dirname, '../public/favicon.ico') 
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // Port 8080 must match vite.config.ts
    win.loadURL('http://localhost:8080'); 
  } else {
    // Points to the built React app
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});