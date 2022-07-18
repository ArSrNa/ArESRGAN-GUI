port = 3000;
var ws=new WebSocket(`ws://localhost:${port}/generate`);


ws.onmessage = function (data) {
  console.log(data.data); // 接收信息
  $('#logs').html(data.data)
  $('#progress').css('width',data.data);
  $('#progress').html(data.data);

  if(data.data=='exit0'){
    $('#processStop').addClass('disabled');
    $('#processStart').removeClass('disabled');
    $('#processStart').html(`处理`);
    //进程退出操作
    //正常退出
    $('#process').attr('src',`${inputFile.files[0].path}_optimization.png`);
    $('#timer').html(`<p class="lead text-success">处理完成，耗时 ${processTime}ms</p>`);
    $('#logProgress').hide()
    $('#progress').css('width','100%');
    $('#progress').html(`处理完成`);
    $('.ar-line').hide();
    clearInterval(timer);
     }else if(data.data=='exitnull'){
    $('#logProgress').css('color','red');
    $('.ar-line').hide();
    $('#processStop').addClass('disabled');
    $('#processStart').removeClass('disabled');
    $('#processStart').html(`处理`);
    clearInterval(timer);
  }
};

function browse(url){
  $.ajax({
    url:`http://localhost:${port}/openURL`,
    data:{url:url},
    success(msg){
      layer.msg(msg);
    }
  })
}


function process() {
  var inputFile = $('#inputFile')[0];
  if(inputFile.files.length>0){
    $('#logProgress').show();
    $('#processStop').removeClass('disabled');
    $('#processStart').addClass('disabled');
    $('#processStart').html(`<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>处理中`);
      var startTime = new Date().getTime();
  timer = setInterval(()=>{
    var nowTime = new Date().getTime();
    processTime = nowTime-startTime;
    $('#timer').html(`处理中，耗时：${processTime}ms`);
  },1);

    var model = $('#model').val();
    ws.send(JSON.stringify({
      file:inputFile.files[0].path,
      model:model
    }))
    $('#aftLink').html(`${inputFile.files[0].path}_optimization.png`);
    $('#aftLink').attr('href',`${inputFile.files[0].path}_optimization.png`);
  }else{
    layer.msg('请上传文件');
  }
}

function paused(){
  ws.send(JSON.stringify({kill:true}));
}


  function change(){
    document.getElementById('inputFile').onchange = function (){
      if(this.files.length>=1){
        let file = this.files[0];
        let reader = new FileReader();
        reader.onload = function(){
          document.getElementById('origin').src = this.result;
        };
        reader.readAsDataURL(file);
        $('#befLink').html(file.path);
        $('#befLink').attr('href',inputFile.files[0].path);
       }else{
         $('._arLoadingText').html('请选择文件');
       }
    }
  }


function checkUpdate(){
  var count=5;
  $.ajax({
    url:"https://api.arsrna.cn/release/appUpdate/ArESRGAN",
    dataType:'json',
    success(msg){
      console.log(msg)
      $('#updateHistory').html(msg.history)
      if(msg.count>count){
        $('.checkUpdate').show()
       layer.open({
         title:`发现新版本 ${msg.rName} ${msg.vNumber}`,
         content: `更新日期：${msg.uTime} <br>${msg.content}`,
         btn:['前往下载','取消'],
         yes: function(index, layero){
          browse(msg.link)
         }
       });         
      }else{
       $('.checkUpdate').hide()
         layer.msg('未发现新版本');
      }
    },

    error(msg){
     layer.msg(`检查失败 ${msg}`);
     console.log(msg.statusText);
    }
  })

}