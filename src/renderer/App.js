import { MemoryRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Layout, Menu, Watermark } from 'antd';
import { BugOutlined, CloudUploadOutlined, CodeFilled, CopyrightOutlined } from '@ant-design/icons'
import './App.css';
import Home from './Home';
import Error from './error';
import Copyright from './Copyright';
const { Content, Footer } = Layout;
console.log('Powered by Ar-Sr-Na');
const { ipcRenderer } = window.electron;


function Main() {
  const navigate = useNavigate();
  const [copyrightShow, setCoyrightShow] = useState(false);
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
            label: '检查更新',
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
  return (
    <Router>
      <Main />
    </Router>
  );
}

function CheckUpdate() {
  const count = 1
  const [show, setShow] = useState(true);
  const [info, setInfo] = useState({});

  useEffect(() => {
    fetch('https://api.arsrna.cn/release/appUpdate/ArESRGAN')
      .then(msg => msg.json())
      .then(msg => {
        console.log(msg);
        setInfo(msg);
        if (msg.count <= count) { setTimeout(() => setShow(false), 3000) }
      });
  }, [])


  return (
    <ToastContainer position='top-end' style={{ padding: 30 }}>
      <Toast show={show} onClose={() => setShow(false)}>
        <Toast.Header>
          <InfoCircle className='me-2' />
          <strong className="me-auto">更新提醒</strong>
          <small className='text-muted'>版本号 {info.vNumber}</small>
        </Toast.Header>
        <Toast.Body>{
          info.count > count ?
            (<>有新版本，请<a href={info.link} target='_blank'>点此前往下载</a></>)
            : '当前已是最新版本'
        }</Toast.Body>
      </Toast>
    </ToastContainer>
  )
}