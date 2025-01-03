import {
  MemoryRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Divider, Layout, Menu, Modal, notification } from 'antd';
import {
  BugOutlined,
  CloudUploadOutlined,
  CodeFilled,
  CopyrightOutlined,
  EllipsisOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import './App.scss';
import Home from './Home';
import Error from './error';
import Copyright from './Copyright';
import { RecoilRoot } from 'recoil';
import FAQ from './faq';

const { Content, Footer } = Layout;
console.log('Powered by Ar-Sr-Na');
const { ipcRenderer } = window.electron;

function Main() {
  const navigate = useNavigate();
  const [copyrightShow, setCoyrightShow] = useState(false);

  useEffect(() => {
    CheckUpdate();
  }, []);
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div className="nav-blur">
        <img
          height="60"
          src={require('./logo.png')}
          style={{ paddingRight: 5 }}
          alt="logo"
        />
        <span className="lead">ArSrNa ESRGAN 图像超分辨率</span>
        <Menu
          mode="horizontal"
          defaultSelectedKeys={['/']}
          style={{ marginLeft: 30, background: 'rgba(0,0,0,0)' }}
          items={[
            {
              key: '/',
              label: <Link to="/">首页</Link>,
              icon: <HomeOutlined />,
            },
            {
              key: '/faq',
              label: <Link to="/faq">常见问题</Link>,
              icon: <QuestionCircleOutlined />,
            },
            {
              label: '更多',
              key: 'more',
              icon: <EllipsisOutlined />,
              children: [
                {
                  label: <a onClick={() => setCoyrightShow(true)}>版权说明</a>,
                  key: 'more',
                  icon: <CopyrightOutlined />,
                },
                {
                  label: (
                    <a onClick={() => ipcRenderer.sendMessage('openDevTools')}>
                      调试控制台
                    </a>
                  ),
                  key: 'console',
                  icon: <CodeFilled />,
                },
                {
                  label: (
                    <a
                      href="https://support.qq.com/products/419220"
                      target="_blank"
                    >
                      问题反馈
                    </a>
                  ),
                  key: 'bug',
                  icon: <BugOutlined />,
                },
                {
                  label: <a onClick={() => CheckUpdate()}>检查更新</a>,
                  key: 'checkUpdate',
                  icon: <CloudUploadOutlined />,
                },
              ],
            },
          ]}
        />
      </div>
      <Content style={{ padding: '80px 20px 0px 20px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/faq" element={<FAQ />} />
          {/* <Route path='/start' element={<Start />} /> */}
          <Route path="*" element={<Error />} />
        </Routes>

        <Copyright show={copyrightShow} setShow={setCoyrightShow} />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        Powered by Ar-Sr-Na
        <Divider type="vertical" />
        上海绫中信息技术有限公司
        <Divider type="vertical" />
        源代码禁止用于商业用途！
      </Footer>
    </Layout>
  );
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
`);
  console.warn('我永远喜欢爱莉希雅！');
  return (
    <Router>
      <RecoilRoot>
        <Main />
      </RecoilRoot>
    </Router>
  );
}

async function CheckUpdate() {
  const hash = await ipcRenderer.invoke('getAsarHash');
  console.log('asar hash; not available in dev', hash);
  let msg = await fetch(
    'https://api.arsrna.cn/release/appUpdate/ArESRGAN'
  ).then((msg) => msg.json());
  console.log(msg);
  openNotification(msg);

  function openNotification(uinfo) {
    const needUpdate = uinfo.hash !== hash;
    const { vNumber, uTime, content, link } = uinfo;
    notification.open({
      message: needUpdate ? '有新版本' : '暂无更新',
      description: needUpdate ? (
        <>
          发现更新：{uTime} {content} 请前往
          <a href={link} target="_blank">
            此处
          </a>
          下载
        </>
      ) : (
        <>
          当前版本：{vNumber} {content}
        </>
      ),
      icon: (
        <CloudUploadOutlined
          style={{
            color: '#108ee9',
          }}
        />
      ),
    });
  }
}
