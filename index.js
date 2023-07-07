const express = require('express');
const expressWs = require('express-ws');
const app = express();
var bodyparser = require('body-parser');
expressWs(app);
const fs = require('fs');
const { spawn } = require('child_process');
const colors = require('colors-console');
const winston = require("winston");

var winstonOptions = {
  file: {
    filename: './log.json',
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: true,
  },
  console: {
    level: 'error',
    handleExceptions: true,
    json: true,
    colorize: true,
  },
};

var logger = new winston.createLogger({
  transports: [
    new winston.transports.File(winstonOptions.file),
    new winston.transports.Console(winstonOptions.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});




if (!fs.existsSync('./config/default.json')) {
  console.log(colors(['blueBG', 'bright'], `首次使用，请修改配置后重启，配置文件见当前目录下 config/default.json`));
  // 创建文件夹
  fs.mkdirSync('./config');
  // 创建文件
  //fs.openSync('./config/default.json', 'w');
  fs.writeFileSync('./config/default.json', JSON.stringify({
    blenderPath: `C:\\Program Files\\Blender Foundation\\blender-3.4.1-windows-x64\\blender.exe`,
    filePath: `D:\\ArSrNaDevelop\\ArBlender\\temporary`,
    port: 4004,
    maxsize: "1000mb"
  }));
  console.log(`配置文件已创建`)
}
var config = require('config');
// logger.info('start');


app.all('*', function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Content-Type', 'application/json;charset=utf-8');
  next();
});

// app.use(bodyparser.urlencoded({ extende: true }));
app.use(bodyparser.json({ "limit": config.maxsize }));


app.post('/download', (req, res) => {
  console.log('download');
  // logger.info('download');
  let base64Data = req.body.data.split(',')[1];
  let dataBuffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(`${config.filePath}\\temp.blend`, dataBuffer);
  res.send({ success: true });
  console.log('工程文件下载成功');
  // logger.info('工程文件下载成功');
});


app.ws('/ArBlender', function (ws, req) {
  console.log(`成功与控制端 ${req.connection.remoteAddress} 连接`)
  // logger.info(`成功与控制端 ${req.connection.remoteAddress} 连接`);
  ws.on('message', function (data) {
    var msg = JSON.parse(data);
    console.log(msg);
    logger.info(msg);
    if (msg.command) {
      render(ws, msg);
    }
  });
  ws.on('close', function (e) {
    console.log('断开连接');
    // logger.info('断开连接');
  });
})

// app.get('/profile', (req, res) => {
//   fs.writeFileSync(`${process.cwd()}\\config\\default.json`, JSON.stringify(req.query.profile))
//   res.send({ success: true })
// })


function render(ws, msg) {
  console.log(colors(['greenBG', 'bright'], '开始渲染'));
  var arblender = spawn(config.blenderPath,
    ['-b', `${config.filePath}\\temp.blend`,
      '-o', `${config.filePath}\\output\\${msg.fileName}.${msg.format}`,
      '-F', msg.format,
      '-s', msg.startFrame,
      '-e', msg.endFrame, '-a']
  )

  arblender.stderr.on('data', function (data) {
    console.log(data);
    var log = {
      type: 'error',
      logs: data.toString('utf8')
    }
    ws.send(log);
    // logger.error(log.logs);
  });

  arblender.stdout.on('data', function (data) {
    console.log(data.toString('utf8'));
    var log = {
      type: 'log',
      logs: data.toString('utf8')
    }
    ws.send(JSON.stringify(log));
    // logger.info(log.logs);
  });
  //blender的日志输出

  arblender.on('exit', function (code, signal) {
    var log = JSON.stringify({
      type: 'exit',
      logs: code,
      signal: signal
    });
    // logger.info(JSON.stringify(log));
    ws.send(log);
  });

}


app.listen(config.port, () => {
  console.log(`从机已在线，请在控制端输入地址`)
  console.log(colors(['italic', 'red'], `<本机IP地址>:${config.port}`))
  console.log(colors(['blueBG', 'bright'], `配置文件见当前目录下 config/default.json`));
  console.table([
    {
      '参数': 'blenderPath',
      '内容': '您的blender.exe绝对路径，要选择到blender.exe',
      '当前配置': config.blenderPath,
    }, {
      '参数': 'filePath',
      '内容': '渲染输出及缓存目录，用于传回控制端，末尾不需要加 \\',
      '当前配置': config.filePath,
    }, {
      '参数': 'port',
      '内容': '服务端端口，记得放开防火墙',
      '当前配置': config.port,
    }, {
      '参数': 'maxsize',
      '内容': 'post最大大小，请按照body-parser参数设置',
      '当前配置': config.maxsize,
    }, {
      '参数': 'password',
      '内容': 'md5后的密码，用于连接控制端使用，当前版本暂无作用',
      '当前配置': '请自行查看',
    }
  ]);

  console.log("日志将会被记录在 ./log.json 下")

  console.log("Powered by Ar-Sr-Na 请您手动检查版本，当前版本 0.0.1")
})