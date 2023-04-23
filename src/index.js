var { Menu, app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
var spawn = require('child_process').spawn;
// var eapp = require('express')();
// const expressWs = require('express-ws');
// expressWs(eapp);


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

let mainWindow;

function createWindow() {
  // Create the browser window.
  //Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 1020,
    height: 850,
    frame: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: true,
    }
  });
  mainWindow.show()
  // and load the index.html of the app.
  mainWindow.loadURL(path.join(__dirname, './index.html'));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

//此处在debug有效，请勿生产时使用！
// esrganPath = path.join(__dirname, "../backres/realsgan/realesrgan-ncnn-vulkan.exe");

/*此处在production有效，请勿在开发时使用！*/
esrganPath = path.join(
  process.cwd(),
  "/resources/extraResources/realsgan",
  "realesrgan-ncnn-vulkan.exe"
);

ipcMain.on('openDevTools', (evt, msg) => {
  mainWindow.webContents.openDevTools();
})

ipcMain.on('killESRGAN', (evt, data) => {
  killProcess();
})

ipcMain.on('generate', (evt, data) => {
  var { file, model } = data;
  esrgan = spawn(esrganPath, [
    '-i', file,
    '-o', `${file}_optimization.png`,
    '-n', model
  ]);

  esrgan.stderr.on('data', function (data) {
    console.log(data.toString('utf8'));
    var progressSet = parseInt(data) / 100
    if (typeof progressSet == 'number') mainWindow.setProgressBar(progressSet)

    mainWindow.webContents.send('generate', {
      type: 'log',
      data: data.toString('utf8')
    });
    //return data;
  });

  esrgan.on('exit', function (code, signal) {
    mainWindow.setProgressBar(-1);
    console.log('child process eixt ,exit:' + code);

    mainWindow.webContents.send('generate', {
      type: 'exit',
      code: code
    });
  });

})




function killProcess() {
  esrgan.kill('SIGINT');
  console.log('killing');
  mainWindow.setProgressBar(-1)
  //res.send('exitnull')
}

var exec = require('child_process').exec
ipcMain.on('openURL', (evt, msg) => {
  switch (process.platform) {
    case "darwin":
      exec(`open ${req.query.url}`);
      break;
    case "win32":
      exec(`start ${req.query.url}`);
      break;
    default:
      exec('xdg-open', [url]);
  }
})

ipcMain.on('enhancePath', (evt, msg) => {
  dialog.showOpenDialog({
    title: '选择保存文件夹', // 窗口标题
    properties: ['openDirectory'] // 限制只能选择文件夹
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filepath = result.filePaths[0];
      console.log('enhance path：', filepath);
      changeConfig('enhancePath', filepath)
      mainWindow.webContents.send('enhancePath', filepath);
    }
  }).catch(err => {
    console.error(err);
  });
})

// eapp.listen(3000)