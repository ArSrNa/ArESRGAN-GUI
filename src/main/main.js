/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app, BrowserWindow, shell, ipcMain, dialog, Menu, webContents } from "electron";
import { autoUpdater } from "electron-updater";
import { resolveHtmlPath } from "./util";
const fs = require('fs');
const path = require('path');
import os from 'os'
import { spawn } from 'child_process';
var RESOURCES_PATH;

class AppUpdater {
  constructor() {
    log.transports.file.level = "info";
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

ipcMain.on("ipc-example", async (event, arg) => {
  const msgTemplate = pingPong => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply("ipc-example", msgTemplate("pong"));
})

if (process.env.NODE_ENV === "production") {
  const sourceMapSupport = require("source-map-support");
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

if (isDebug) {
  require("electron-debug")();
}

const installExtensions = async () => {
  const installer = require("electron-devtools-installer");
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ["REACT_DEVELOPER_TOOLS"];

  return installer
    .default(
      extensions.map(name => installer[name]),
      forceDownload
    )
    .catch(console.log);
}

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, "assets")
    : path.join(__dirname, "../../assets")

  const getAssetPath = (...paths) => {
    return path.join(RESOURCES_PATH, ...paths);
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 728,
    minWidth: 1200,
    minHeight: 600,
    icon: getAssetPath("icon.ico"),
    webPreferences: {
      webSecurity: false,
      // odeIntegration: true,
      // contextIsolation: false,
      // nodeIntegration: true,
      devTools: true,
      preload: app.isPackaged
        ? path.join(__dirname, "preload.js")
        : path.join(__dirname, "../../.erb/dll/preload.js")
    }
  })

  mainWindow.loadURL(resolveHtmlPath("index.html"));

  mainWindow.on("ready-to-show", () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null;
  })

  // const menuBuilder = new MenuBuilder(mainWindow)
  // menuBuilder.buildMenu()

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(edata => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  })

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
  Menu.setApplicationMenu(null);
}


app.on("window-all-closed", () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== "darwin") {
    app.quit();
  }
})

app.whenReady()
  .then(() => {
    createWindow()
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow()
    })
  })
  .catch(console.log);


ipcMain.on('env', () => {
  mainWindow.webContents.send('env', app.isPackaged);
});


ipcMain.on('setOutPath', (evt, msg) => {
  dialog.showOpenDialog({
    title: "请选择文件夹", // 窗口标题
    properties: ['openDirectory'] // 限制只能选择文件夹
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filepath = result.filePaths[0].replaceAll('\\', '/');
      mainWindow.webContents.send('setOutPath', filepath);
    }
  }).catch(err => {
    console.error(err);
  });
});

ipcMain.on('saveFile', (e, m) => {
  const { base64String, filePath, fileName } = m;
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath);
  }
  fs.writeFile(`${filePath}\\${fileName}`, buffer, (err) => {
    if (err) {
      console.error('保存文件时发生错误:', err);
      mainWindow.webContents.send('saveFile', { success: false, data: err });
      return;
    }
    mainWindow.webContents.send('saveFile', { success: true, data: `${filePath}/${fileName}` });
    console.log('文件保存成功:', `${filePath}/${fileName}`);
  });
});

ipcMain.on('openDevTools', (evt, msg) => {
  mainWindow.webContents.openDevTools();
});

ipcMain.on('esrgan', (evt, data) => {
  var { file, model, command, kill } = data;

  if (command) {
    const esrgan = spawn(esrganPath, [
      '-i', file,
      '-o', `${file}_optimization.png`,
      '-n', model
    ]);

    esrgan.stderr.on('data', function (data) {
      console.log(data.toString('utf8'));
      var progressSet = parseInt(data) / 100
      if (typeof progressSet == 'number') mainWindow.setProgressBar(progressSet)

      mainWindow.webContents.send('esrgan', {
        type: 'log',
        data: data.toString('utf8')
      });
      //return data;
    });

    esrgan.on('exit', function (code, signal) {
      mainWindow.setProgressBar(-1);
      console.log('child process eixt ,exit:' + code);

      mainWindow.webContents.send('esrgan', {
        type: 'exit',
        code: code
      });
    });
  }

  if (kill) {
    esrgan.kill('SIGINT');
    console.log('killing');
    mainWindow.setProgressBar(-1)
  }




})