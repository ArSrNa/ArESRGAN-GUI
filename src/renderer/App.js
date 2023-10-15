import { MemoryRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, Menu, notification } from 'antd';
import { BugOutlined, CloudUploadOutlined, CodeFilled, CopyrightOutlined } from '@ant-design/icons'
import './App.css';
import Home from './Home';
import Error from './error';
import Copyright from './Copyright';
import { uuid } from './Components';
import Aegis from 'aegis-web-sdk';

const { Content, Footer } = Layout;
console.log('Powered by Ar-Sr-Na');
const { ipcRenderer } = window.electron;



function Main() {
  const navigate = useNavigate();
  const [copyrightShow, setCoyrightShow] = useState(false);
  useEffect(() => {
    CheckUpdate()
  }, [])
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div className='nav-blur'>
        <img height="60" src={require('./logo.png')} style={{ paddingRight: 5 }} alt="logo" />
        <span className='lead'>ArSrNa ESRGAN 图像超分辨率</span>
        <Menu mode="horizontal" defaultSelectedKeys="/" style={{ marginLeft: 30, background: 'rgba(0,0,0,0)' }}
          items={[{
            label: <a onClick={() => setCoyrightShow(true)}>版权说明</a>,
            key: 'copyright',
            icon: <CopyrightOutlined />
          }, {
            label: <a href='https://support.qq.com/products/419220' target='_blank'>问题反馈</a>,
            key: 'bug',
            icon: <BugOutlined />
          }, {
            label: <a onClick={() => CheckUpdate()}>检查更新</a>,
            key: 'checkUpdate',
            icon: <CloudUploadOutlined />
          }, {
            label: <a onClick={() => ipcRenderer.sendMessage('openDevTools')}>调试控制台</a>,
            key: 'console',
            icon: <CodeFilled />
          }
          ]}
        >
        </Menu>
      </div>
      <Content style={{ padding: '80px 20px 0px 20px' }}>
        <Routes>
          <Route path='/' element={<Home />} />
          {/* <Route path='/start' element={<Start />} /> */}
          <Route path="*" element={<Error />} />
        </Routes>

        <Copyright show={copyrightShow} setShow={setCoyrightShow} />

      </Content>
      <Footer style={{ textAlign: 'center' }}>
        <p>Powered by Ar-Sr-Na</p>
      </Footer>
    </Layout>
  )
}

export default function App() {
  console.log(`
####    ##                    #         
#        #                              
###      #    #  #   ####    ##     ### 
#        #    #  #   ##       #    #  # 
#        #    ## #     ##     #    #  # 
####    ###     ##   ####    ###    ####
              #  #
               ##
`)
  console.warn('我永远喜欢爱莉希雅！');

  const aegis = new Aegis({
    id: 'W7oejTaL4r0ek1Yg67', // 上报 id
    uin: `ESRGAN-Photo ${uuid()}`, // 用户唯一 ID（可选）
    reportApiSpeed: true, // 接口测速
    reportAssetSpeed: true, // 静态资源测速
    spa: true, // spa 应用页面跳转的时候开启 pv 计算
    hostUrl: 'https://rumt-zh.com'
  });

  return (
    <Router>
      <Main />
    </Router>
  );
}

function CheckUpdate() {
  const count = 14;
  fetch('https://api-gz.arsrna.cn/release/appUpdate/ArESRGAN')
    .then(msg => msg.json())
    .then(msg => {
      console.log(msg);
      openNotification(msg);
    });

  const openNotification = (uinfo) => {
    const update = uinfo.count > count;
    const { vNumber, uTime, content, link } = uinfo
    notification.open({
      message: update ? '有新版本' : '暂无更新',
      description: update
        ? <>发现更新：{uTime} <div dangerouslySetInnerHTML={{ __html: content }} /> 请前往<a href={link} target='_blank'>此处</a>下载</>
        : <>当前版本：{vNumber} <div dangerouslySetInnerHTML={{ __html: content }} /></>,
      icon: (
        <CloudUploadOutlined
          style={{
            color: '#108ee9',
          }}
        />
      ),
    })
  };

}
