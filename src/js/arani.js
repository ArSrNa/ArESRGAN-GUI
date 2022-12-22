port = 3000;
var ws = new WebSocket(`ws://localhost:${port}/generate`);
window.fileList=[]
var appInfo={
  count:10
}


//Array初始化代码
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};


ws.onmessage = function (res) {
  var data=JSON.parse(res.data);
  console.log(data); // 接收信息
  if(data.type=='log'){
  $("#logs").html(data.data);
  $("#progress").css("width", data.data);
  $("#progress").html(data.data);
  $("#logProgress").show();
    $("#processStop").removeClass("disabled");
    $("#processStart").addClass("disabled");
    $("#processStart").html(
      `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>处理中`
    );
    $(`#filesBtn_${generallyPicsCount}`).addClass('active');
  }

  if (data.type == "exit" && data.code=='exit0') {
    $("#processStop").addClass("disabled");
    $("#processStart").removeClass("disabled");
    $("#processStart").html(`处理`);
    //进程退出操作
    //正常退出
    $("#process").attr('src',`${fileList[generallyPicsCount].path}_optimization.png`)

    $("#timer").html(
      `<p class="lead text-success">处理完成，耗时 ${processTime}ms</p>`
    );
    $("#logProgress").hide();
    $("#progress").css("width", "100%");
    $("#progress").html(`处理完成`);
    $(".ar-line").hide();
    clearInterval(timer);
    $(`#filesBtn_${generallyPicsCount}`).html(`第${generallyPicsCount}张完成，耗时 ${processTime}ms`);
    $(`#filesBtn_${generallyPicsCount}`).removeClass('active');
  
    if(generallyPicsCount+1<filePath.length){
         generallyPicsCount++;
         sendCommand(generallyPicsCount);
    }
  } else if(data.type == "exit") {
    $("#logProgress").css("color", "red");
    $(".ar-line").hide();
    $("#processStop").addClass("disabled");
    $("#processStart").removeClass("disabled");
    $("#processStart").html(`处理`);
    $("#progress").html(`非正常退出：${data.code}`);
    clearInterval(timer);
  }
};

function browse(url) {
  $.ajax({
    url: `http://localhost:${port}/openURL`,
    data: { url: url },
    success(msg) {
      layer.msg(msg);
    },
  });
}

function process() {
  filePath = [];
  window.generallyPicsCount=0;
  if (fileList.length > 0) {
    for(var i=0;i<fileList.length;i++){
      filePath.push(fileList[i].path);
    }
    sendCommand(0);
  } else {
    layer.msg("请上传文件");
  }
}

function paused() {
  ws.send(JSON.stringify({ kill: true }));
}

function sendCommand(i){
  var startTime = new Date().getTime();
    timer = setInterval(() => {
      var nowTime = new Date().getTime();
      processTime = nowTime - startTime;
      $("#timer").html(`处理中，耗时：${(processTime/1000).toFixed(2)} s`);
    }, 1);

  console.log(`第 ${i} bottom`);
  ws.send(
    JSON.stringify({
      file: filePath[i],
      model: $("#model").val(),
    })
  );
}


var fileChange={
  add:function(files){
    for(var i0=0;i0<files.length;i0++){
      fileList.push(files[i0]);
    }
    fileChange.change()
  },

  change:function(){
    //分辨率信息
    $('#resolutionBefore').html(`处理前：${$('#origin')[0].naturalWidth} * ${$('#origin')[0].naturalHeight}`)
    $('#resolutionAfter').html(`处理后：${$('#origin')[0].naturalWidth*4} * ${$('#origin')[0].naturalHeight*4}`)
  
    //定义列表模板
    var htmlTmp='';
    for(var i1=0;i1<fileList.length;i1++){
      var temp = `
      <li class="list-group-item list-group-item-action filesBtn" id="filesBtn_${i1}">
      <button type="button" class="btn-close" onclick="fileChange.remove(${i1});"></button>
      <span class="badge bg-primary rounded-pill" onclick="mutiChange(${i1})">${i1+1}</span>
      ${fileList[i1].name}
      </li>`;
      htmlTmp += temp;    
    }
    console.log(fileList)
    $('#photoPreviewList').html(htmlTmp)

    try{
    //更新基本信息
    $('#fileLength').html(`共有：${fileList.length} 张图片`)
    $('#origin').attr('src',fileList[0].path)
    $('#filePath').html(fileList[0].path)
    }catch(err){
      console.warn(`更新列表信息err ${err}`)
    }

    if(fileList.length==0){
      $('#processStart').addClass('disabled')
    }else{
      $('#processStart').removeClass('disabled')
    }
  },

  remove:function(key){
    fileList.remove(key,key);
    fileChange.change()
  }
}




function mutiChange(i1){
  var filePathMuti = fileList[i1].path.replaceAll('\\','/');
    $('#origin').attr('src',filePathMuti);
    $('#filePath').html(filePathMuti)
    $('#resolutionBefore').html(`处理前：${$('#origin')[0].naturalWidth} * ${$('#origin')[0].naturalHeight}`)
    $('#resolutionAfter').html(`处理后：${$('#origin')[0].naturalWidth*4} * ${$('#origin')[0].naturalHeight*4}`)
    $.ajax({
      url:filePathMuti+'_optimization.png',
      success(msg){
        //console.log(msg)
      $('#process').attr('src',filePathMuti+'_optimization.png');
      $('#aftLink').html(filePathMuti+'_optimization.png')
      },
      error(err){
        console.log({log:'处理后图片无法查询到',err:err});
      }
    })
}

window.onload = function () {
  var oBox = document.getElementById('fileUpload');
  //进入子集的时候 会触发ondragover 频繁触发 不给ondrop机会
  oBox.ondragenter = function(){
   oBox.innerHTML = '释放鼠标即可上传';
  };
  oBox.ondragover = function(){
   return false;
  };
  oBox.ondragleave = function(){
   oBox.innerHTML = `拖拽文件到此 或
   <a style="color:royalblue;" onclick="document.getElementById('inputFile').click()">选择文件</a>
  上传`;
  };
  oBox.ondrop = function(ev){
    oBox.innerHTML = `拖拽文件到此 或
   <a style="color:royalblue;" onclick="document.getElementById('inputFile').click()">选择文件</a>
  上传`
   var oFile = ev.dataTransfer.files;
   console.log(oFile)
   fileChange.add(oFile)
   return false;
  };
 };


console.log('Powered by Ar-Sr-Na RenderInfinity')
console.log('More infomation: https://www.arsrna.cn')


function checkUpdate() {
  version = `2.2.0`
  $.ajax({
    url: "https://api.arsrna.cn/release/appUpdate/ArESRGAN",
    dataType: "json",
    success(msg) {
      console.log(msg);
      $("#updateHistory").html(msg.history);
      if (msg.count > appInfo.count) {
        $(".checkUpdate").show();
        layer.open({
          title: `发现新版本 ${msg.rName} ${msg.vNumber}`,
          content: `更新日期：${msg.uTime} <br>${msg.content}`,
          btn: ["前往下载", "取消"],
          yes: function (index, layero) {
            browse(msg.link);
          },
        });
      } else {
        $(".checkUpdate").hide();
        layer.msg("未发现新版本");
      }
    },

    error(msg) {
      layer.msg(`检查失败 ${msg}`);
      console.log(msg.statusText);
    },
  });
}