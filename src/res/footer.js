function writeHTMLasJS(){
$.ajax({
    url:'https://www.arsrna.cn/footer.html',
    success(html){
        $('body').after(html);
        //console.log(html)
    }
})
}

$(document).ready(function(){
    writeHTMLasJS();
})

console.log("powered by Ar-Sr-Na");