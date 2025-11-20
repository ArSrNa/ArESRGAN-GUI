import { app, BrowserWindow, shell, ipcMain, dialog, Menu } from "electron";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import os from "node:os";

import "./esrgan";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//

process.env.APP_ROOT = path.join(__dirname, "../..");
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
// export const RENDERER_DIST = (process.env.APP_ROOT);
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;
export const getAssetPath = (...paths: string[]): string =>
  isDebug
    ? path.join(process.env.VITE_PUBLIC, ...paths)
    : path.join(process.resourcesPath, "public", ...paths);

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

console.log("Powered by Ar-Sr-Na https://www.arsrna.cn");
console.log("SystemType", {
  platform: os.platform(),
  release: os.release(),
  type: os.type(),
  arch: os.arch(),
});

export let mainWindow: BrowserWindow | null = null;
const preload = path.join(__dirname, "../preload/index.js");
const indexHtml = path.join(RENDERER_DIST, "index.html");

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Main window",
    icon: path.join(process.env.VITE_PUBLIC, "icon.ico"),
    width: 1200,
    height: 728,
    minWidth: 1200,
    minHeight: 600,
    webPreferences: {
      preload,
      webSecurity: false,
      // odeIntegration: true,
      // contextIsolation: false,
      // nodeIntegration: true,
      devTools: true,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    // #298
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // Open devTool if the app is not packaged
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send(
      "main-process-message",
      new Date().toLocaleString()
    );
  });

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });

  Menu.setApplicationMenu(null);
}

app
  .whenReady()
  .then((e) => {
    createWindow();
    app.on("activate", () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

app.on("window-all-closed", () => {
  mainWindow = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (mainWindow) {
    // Focus on the main window if the user tried to open another
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});

const isDebug =
  process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

ipcMain.handle("getAsarHash", async () => {
  if (process.env.NODE_ENV === "development") {
    return null;
  }
  const type = os.type() === "Darwin" ? "macos" : "windows";

  console.log("process.resourcesPath:", process.resourcesPath);
  console.log("process.cwd():", process.cwd());
  console.log("app.isPackaged:", app.isPackaged);
  console.log("app.getVersion():", app.getVersion());

  try {
    // Since we can't read the asar file from within the asar archive,
    // we'll use the application version and other identifiers to create a hash
    const version = app.getVersion();
    const platform = os.platform();
    const arch = os.arch();
    const appName = app.getName();

    // Create a unique identifier based on app info
    const appInfo = `${appName}-${version}-${platform}-${arch}`;
    console.log("App info for hash:", appInfo);

    // Generate a hash from the app info
    const hash = crypto.createHash("sha256").update(appInfo).digest("hex");
    console.log("Generated hash:", hash);

    return { type, hash };
  } catch (error) {
    console.error("Error generating app hash:", error);
    return { type, hash: null, error: "Failed to generate app hash" };
  }
});

ipcMain.handle("env", () => {
  mainWindow.webContents.send("env", app.isPackaged);
});

ipcMain.handle("setOutPath", async (evt, msg) => {
  try {
    let result = await dialog.showOpenDialog({
      title: "请选择文件夹", // 窗口标题
      properties: ["openDirectory"], // 限制只能选择文件夹
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filepath = result.filePaths[0].replaceAll("\\", "/");
      return filepath;
    }
  } catch (err) {
    console.error(err);
  }
});

ipcMain.on("openDevTools", (evt, msg) => {
  mainWindow.webContents.openDevTools();
});

ipcMain.handle("getModels", async (evt, msg) => {
  try {
    //扫描带有.param后缀且有.bin的文件即为模型
    const models = fs
      .readdirSync(path.join(getAssetPath("./realsgan"), "./models"))
      .filter((file) => file.includes(".param"));
    // console.log(models);
    return { success: true, data: models };
  } catch (err) {
    return { success: false, data: err };
  }
});

ipcMain.handle("selectFolder", async (evt, msg) => {
  try {
    let result = await dialog.showOpenDialog({
      title: "请选择文件夹",
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filepath = result.filePaths[0].replaceAll("\\", "/");
      return filepath;
    }
  } catch (err) {
    console.error(err);
  }
});
