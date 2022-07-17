const { app, BrowserWindow } = require('electron');
const path = require('path');
var spawn = require('child_process').spawn;
var eapp = require('express')();
const expressWs = require('express-ws');
expressWs(eapp);


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 600,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './index.html'));
  // require("./menu")
  //mainWindow.removeMenu()
  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
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


eapp.ws('/generate',function(ws,req){
  console.log('Powered by Ar-Sr-Na Express');

  ws.on('message', function (msg) {
    //ws.send('default response')
    var data = JSON.parse(msg);
    if(data.kill){
      killProcess();
    }else{
    console.log(data.file);
    optimization(ws,data);
    }
  })

function optimization(ws,data){
  var file = data.file;
  var model = data.model;
  esrgan = spawn(path.join(__dirname.replace('src',''), `../realsgan/realesrgan-ncnn-vulkan.exe`),[
    '-i',file,
    '-o',`${file}_optimization.png`,
    '-n',model
  ]); 
  esrgan.stderr.on('data', function (data) { 
    console.log(data.toString('utf8'));
    ws.send(data.toString('utf8'));
    //return data;
    }); 
    esrgan.on('exit', function (code, signal) { 
    console.log('child process eixt ,exit:' + code); 
    ws.send('exit'+code);
    return code
    });
  }

    ws.on('close', function (code,signal) {
      console.log('close connection')
      ws.send(JSON.stringify({
        'force':true,
        'exit':code
      }))
    })

})

function killProcess() {
  esrgan.kill('SIGINT');
  console.log('killing');
  //res.send('exitnull')
}


eapp.listen(3000)