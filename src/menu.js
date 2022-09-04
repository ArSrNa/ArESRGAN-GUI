const {Menu} = require("electron");
 
var menuTemplate=[
    {
        label:"页面",
        submenu:[
            // accelerator 配置快捷键
            {label:'刷新页面',accelerator:"f5",click:()=>{window.reolad()}},
            {label:'关闭应用程序',accelerator:"ctrl+w",click:()=>{console.log("打开文件")}},
        ]
    },
    {
        label:"编辑",
        submenu:[
            // role按角色进行配置
            {label:"复制",role:"copy",click:()=>{console.log("复制文件")}},
            {label:"粘贴",role:"paste",click:()=>{console.log("粘贴文件")}}
        ]
    }
];
// 固定写法
var menuBuilder = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menuBuilder);