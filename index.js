const { app, BrowserWindow } = require('electron');
const path = require('path');
var spawn = require('child_process').spawn;
var express = require('express')
var eapp = express()
const expressWs = require('express-ws') 
expressWs(eapp)

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './src/index.html'));
  mainWindow.removeMenu()
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
  console.log('Powered by Ar-Sr-Na Express')

   // 使用 on 方法监听事件
  //   message 事件表示从另一段（服务端）传入的数据
  ws.on('message', function (msg) {
    ws.send('default response')
    var data = JSON.parse(msg)
    console.log(data.file)
    optimization(ws,data)
  })

function optimization(ws,data){
  var file = data.file;
  var model = data.model;
  var esrgan = spawn(`${process.cwd()}\\resources\\realsgan\\realesrgan-ncnn-vulkan.exe`,[
    '-i',file,
    '-o',`${file}_optimization.png`,
    '-n',model
  ]); 
  esrgan.stderr.on('data', function (data) { 
    //console.log(data);
    //res.write(`${data}<br>`);
    //sentToFront(data);
    console.log(data.toString('utf8'))
    ws.send(data.toString('utf8'))
    //return data;
    }); 
    esrgan.on('exit', function (code, signal) { 
    console.log('child process eixt ,exit:' + code); 
    ws.send('exit' + code)
    return code
    });
  }

    ws.on('close', function (e) {
      console.log('close connection')
    })

})


eapp.listen(3000)


function aresrgan(file,model) {
//var cmd = `${process.cwd()}\\src\\realsgan\\realesrgan-ncnn-vulkan.exe -i ${file} -o ${file}_optimization.png -n ${model}`;
var esrgan = spawn(`${process.cwd()}\\src\\realsgan\\realesrgan-ncnn-vulkan.exe`,[
  '-i',file,
  '-o',`${file}_optimization.png`,
  '-n',model
]); 
esrgan.stderr.on('data', function (data) { 
  console.log(data);
  return(data)
  }); 

  esrgan.on('exit', function (code, signal) { 
  console.log('child process eixt ,exit:' + code); 
  return('child process eixt ,exit:' + code)
  });
}

/*
<div class="display-4">作者寄语</div>
      <div class="lead">在此感谢所有对本应用与本团队的支持，
        同时，应用正常运行与维护离不开他们的支持，离不开他们的维护，
        在这里郑重感谢下列来自腾讯的工程师以及来自各行各业的开发者，他们解答了我们的疑难，半夜还在敬业地为我们查找问题：</div>
        <p>
        <br />腾讯云高级工程师：王冬生
        <br />腾讯云TDP：一个温柔的小哥哥、鸡毛换糖、Ar-Sr-Na；
        <br />腾讯云研发团队：上官青儿、庄园、不期而遇、wayen、wuyanjun、风之泪、Ha🦛；
        <br />腾讯云架构与服务：*海名
        <br />腾讯云CVM团队、腾讯云Batch团队、腾讯云Serverless团队、腾讯云CIAM团队</p>     
      <p>这个应用，是一项巨大的挑战，我们从未在Windows平台上写过APP，
       <br>当看到控制台里输出了文字："D:/YuukiAsuna_optimization.png；connection closed"时，意味着这个项目最关键的地方已经告一段落，我们成功了！
       <br>这种心情，估计只有开发者懂得，当进度条跑到100%的时候，我们永远不知道接下来会发生什么，弹窗报错？还是预期内容？在经历了上千次疯狂弹窗之后，我们得到了绿色的log
       <br>这是我目前人生中对接最多API的应用程序，涉及到了Powershell,ajax,express,websocket,cosfs......
       <strong>祝大家使用愉快！</strong>
       <hr>以下是开发版本日志
       <br>2022-2-10 应用开始筹划
       <br>2022-2-14 2:12 成功上线第一个Release 1.0
      </p>
      </div>
      */