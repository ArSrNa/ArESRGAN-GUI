import { Divider, Modal, Space } from 'antd';
import './App.scss';

export default function Copyright({ show, setShow }) {
  return (
    <>
      <Modal
        title="版权说明"
        open={show}
        onCancel={() => setShow(false)}
        okButtonProps={{ style: { display: 'none' } }}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Space direction="vertical" size="middle">
          <div>
            <Divider orientation="left">Real ESRGAN</Divider>
            软件超分辨率功能来自模型 Real-ESRGAN，并遵循 BSD 3-Clause License
            公共许可协议
            <a href="https://github.com/xinntao/Real-ESRGAN" target="_blank">
              https://github.com/xinntao/Real-ESRGAN
            </a>
          </div>

          <div>
            <Divider orientation="left">Ant Design</Divider>
            软件UI来自Ant Design，并遵循 MIT 公共许可协议
            <a href="https://github.com/ant-design/ant-design/" target="_blank">
              https://github.com/ant-design/ant-design/
            </a>
          </div>

          <div>
            <Divider orientation="left">electron-react-boilerplate</Divider>
            开发脚手架为electron-react-boilerplate，并遵循 MIT 公共许可协议
            <a
              href="https://github.com/electron-react-boilerplate/electron-react-boilerplate"
              target="_blank"
            >
              https://github.com/electron-react-boilerplate/electron-react-boilerplate
            </a>
          </div>

          <div>
            <Divider orientation="left">本软件</Divider>
            本软件作者：Ar-Sr-Na（
            <a href="https://www.arsrna.cn" target="_blank">
              www.arsrna.cn
            </a>
            ）拥有修改与二次创作该作品的权利，并受法律保护； 软件按照GNU
            GPL3.0协议进行开放源代码。
            <br />
            本软件同时有软件著作权登记，与开源部分并不冲突，用于违规使用（如进行非法内容的处理、不正当用途损害作者权益等）时维权兜底。
          </div>
        </Space>
      </Modal>
    </>
  );
}
