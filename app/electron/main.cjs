// Desktop shell for M.M.C.: the same web build, in its own window, offline. Saves live in the app's own storage.
const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('node:path')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

function createWindow() {
  const window = new BrowserWindow({
    width: 1280, height: 800, minWidth: 480, minHeight: 360,
    title: 'M.M.C. — Magia & Metal & Combustão',
    backgroundColor: '#111a18',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  Menu.setApplicationMenu(null)
  void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  // Links to the outside open in the real browser, never inside the game window.
  window.webContents.setWindowOpenHandler(({ url }) => { void shell.openExternal(url); return { action: 'deny' } })
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file://')) { event.preventDefault(); void shell.openExternal(url) } })
  window.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11')) window.setFullScreen(!window.isFullScreen())
  })
}

const single = app.requestSingleInstanceLock()
if (!single) app.quit()
else {
  app.on('second-instance', () => { const [window] = BrowserWindow.getAllWindows(); if (window) { if (window.isMinimized()) window.restore(); window.focus() } })
  app.whenReady().then(createWindow)
  app.on('window-all-closed', () => app.quit())
}
