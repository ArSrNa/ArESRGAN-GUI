var ws=new WebSocket(`ws://localhost:3000/generate`)
ws.onmessage = function (data) {
  console.log(data.data); // 接收信息
  $('h5').html(`处理中：${data.data}`)
  $('#progress').css('width',data.data)
  $('#progress').html(data.data)
  if(data.data=='exit0'){
    //ws.close()
    $('#process').attr('src',`${inputFile.files[0].path}_optimization.png`)
    arProgressing('arLoading',`处理完成，耗时${sumTime.toFixed(3)}s`,'fa-check-circle')
    $('#progress').css('width','100%')
    $('#progress').html(`处理完成`)
    $('.ar-line').hide()
    clearInterval(taskTimer)
  }
};

function process() {
  arProgressing('arLoading','处理中','fa-info-circle')
    inputFile = document.getElementById('inputFile');
    if(inputFile.files.length>=1){
        sumTime=0
  taskTimer=setInterval((e)=>{
    sumTime+=0.1
    $('#timer').html(`计时 ${sumTime.toFixed(3)}s`)
  },100)

    var model = $('#model').val();
    ws.send(JSON.stringify({
      file:inputFile.files[0].path,
      model:model
    }))
    $('#aftLink').html(`${inputFile.files[0].path}_optimization.png`)
    $('#aftLink').attr('href',`${inputFile.files[0].path}_optimization.png`)
  }else{
    $('h5').html('请上传文件')
  }
}


/* 2022-2-14 1:35 Ajax弃用

 $.ajax({
      url:'http://localhost:3000/generate',
      type:'GET',
      data:{
          file:inputFile.files[0].path,
          model:model
      },
      success(msg) {
          console.log(msg);
          $('#process').attr('src',`${inputFile.files[0].path}_optimization.png`)
          arProgressing('arLoading','处理完成','fa-check-circle')
          $('#log').html(msg)
          $('#aftLink').html(`${inputFile.files[0].path}_optimization.png`)
          $('.ar-line').hide()
      }
    })
    */

  function change(){
    document.getElementById('inputFile').onchange = function (){
      if(this.files.length>=1){
        let file = this.files[0];
        let reader = new FileReader();
        //新建 FileReader 对象
        reader.onload = function(){
          // 当 FileReader 读取文件时候，读取的结果会放在 FileReader.result 属性中
          document.getElementById('origin').src = this.result;
        };
        // 设置以什么方式读取文件，这里以base64方式
        reader.readAsDataURL(file);
        $('#befLink').html(file.path)
        $('#befLink').attr('href',inputFile.files[0].path)
       }else{
         $('h5').html('请选择文件')
       }
    }


  }

  function arProgressing(Class,text,icons){
    arLoadingClass({
        text:text,
        color: '#DDDDDD',
        Class: Class,
        size: '3',
        icon: icons})
}
