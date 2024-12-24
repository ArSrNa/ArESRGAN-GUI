import {
  Card,
  Col,
  Row,
  Alert,
  Image,
  Upload,
  Form,
  Button,
  Select,
  Table,
  Progress,
  message,
  Space,
  Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { DataSourceState, filesState } from './states';
import { DataSourceType } from './types';
import './App.scss';
const { ipcRenderer } = window.electron;
const { Dragger } = Upload;

export default function Home() {
  const setDataSource = useSetRecoilState(DataSourceState);
  const [form] = Form.useForm();
  /**存储模式，当前目录或自定义目录 */
  // const [isCurrent, setIsCurrent] = useState('current');
  const [model, setModel] = useState('realesrgan-x4plus-anime');
  const [files, setFiles] = useRecoilState(filesState);
  const [modelList, setModelList] = useState([]);

  useEffect(() => {
    /**文件上传后，将文件信息转换为DataSourceType */
    let res = files.map((fileObj) => {
      const file = fileObj.originFileObj;
      return {
        id: file.uid,
        origin: file.path,
        path: file.path,
        progress: 0,
        status: '等待处理',
      };
    });
    setDataSource(res);
  }, [files]);

  /**
   * @description 设置输出路径
   */
  // const handleSetPath = () => {
  //   form.setFieldValue('customPath', {
  //     path: '我永远喜欢爱莉希雅',
  //     type: isCurrent,
  //   });
  // };

  useEffect(() => {
    /**获取模型列表 */
    ipcRenderer.invoke('getModels').then((e) => {
      if (!e.success) {
        message.error(e.data);
        return;
      }
      setModelList(e.data);
    });
  }, []);

  return (
    <>
      <Space size="middle" direction="vertical" style={{ width: '100%' }}>
        <Card title="文件输入配置">
          <Row gutter={16}>
            <Col span={12}>
              <Form
                form={form}
                onFinish={console.log}
                initialValues={{
                  model: 'realesrgan-x4plus-anime',
                  customPath: {
                    type: 'current',
                  },
                }}
                layout="vertical"
              >
                <Form.Item label="文件">
                  <Dragger
                    onChange={(e) => setFiles(e.fileList)}
                    fileList={files}
                    customRequest={() => {}}
                    showUploadList={false}
                    multiple
                    accept="image/*"
                  >
                    <p className="ant-upload-drag-icon">
                      <PlusOutlined />
                    </p>
                    <p className="ant-upload-text">点击此处或拖入文件以上传</p>
                  </Dragger>
                </Form.Item>
                <Form.Item name="model" label="选择模型">
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="选择模型"
                    options={modelList}
                    onChange={(e) => setModel(e)}
                  />
                </Form.Item>

                {/* 功能尚未完成，请勿启用 */}
                {/* <Form.Item label="输出路径">
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item noStyle name={['customPath', 'type']}>
                      <Select style={{ width: 150 }} onChange={setIsCurrent}>
                        <Select.Option value="custom">自定义路径</Select.Option>
                        <Select.Option value="current">当前路径</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item noStyle name={['customPath', 'path']}>
                      <Input
                        onClick={() => {
                          if (isCurrent === 'custom') {
                            handleSetPath();
                          }
                        }}
                        readOnly
                        placeholder={
                          isCurrent === 'custom' ? '单击进行更改' : ''
                        }
                      />
                    </Form.Item>
                  </Space.Compact>
                </Form.Item> */}
              </Form>
            </Col>

            <Col span={12}>
              <Alert
                message="软件缺陷"
                description={
                  <>
                    目前在想办法自定义输出目录，但是没有思路；欢迎去
                    <a
                      href="https://github.com/ArSrNa/ArESRGAN-GUI"
                      target="_blank"
                    >
                      github
                    </a>
                    或兔小巢（软件顶栏反馈处）上提交您的建议！
                    <br />
                    希望大家可以在github上多多点下star支持一下！
                  </>
                }
                type="info"
                showIcon
              />
            </Col>
          </Row>
        </Card>

        <TView model={model} />
      </Space>
    </>
  );
}

function TView({ model }) {
  const [files, setFiles] = useRecoilState(filesState);
  const [start, setStart] = useState(false);
  const [dataSource, setDataSource] = useRecoilState(DataSourceState);

  function changeColumn(i: number, key: keyof DataSourceType, value: any) {
    setDataSource((prevDataSource) => {
      const updatedDataSource = [...prevDataSource];
      updatedDataSource[i] = { ...updatedDataSource[i], [key]: value };
      return updatedDataSource;
    });
  }
  //   path(i, path) {
  //     setDataSource((prevDataSource) => {
  //       const updatedDataSource = [...prevDataSource];
  //       updatedDataSource[i] = { ...updatedDataSource[i], path };
  //       return updatedDataSource;
  //     });
  //   },
  //   origin(i, origin) {
  //     setDataSource((prevDataSource) => {
  //       const updatedDataSource = [...prevDataSource];
  //       updatedDataSource[i] = { ...updatedDataSource[i], origin };
  //       return updatedDataSource;
  //     });
  //   },
  //   process(i, process) {
  //     setDataSource((prevDataSource) => {
  //       const updatedDataSource = [...prevDataSource];
  //       updatedDataSource[i] = { ...updatedDataSource[i], process };
  //       return updatedDataSource;
  //     });
  //   },
  //   progress(i, progress) {
  //     setDataSource((prevDataSource) => {
  //       const updatedDataSource = [...prevDataSource];
  //       updatedDataSource[i] = { ...updatedDataSource[i], progress };
  //       return updatedDataSource;
  //     });
  //   },
  //   status(i, status) {
  //     setDataSource((prevDataSource) => {
  //       const updatedDataSource = [...prevDataSource];
  //       updatedDataSource[i] = { ...updatedDataSource[i], status };
  //       return updatedDataSource;
  //     });
  //   },

  //   delete(i) {
  //     const newData = dataSource.filter((arr) => arr !== dataSource[i]);
  //     setDataSource(newData);
  //   },
  // };

  const handleStop = async () => {
    await ipcRenderer.invoke('esrgan', { type: 'kill' });
    setStart(false);
  };

  /**处理超分辨率（批量） */
  const startProcess = async () => {
    for (let count = 0; count < dataSource.length; count++) {
      setStart(true);
      console.log(count, '开始处理');

      //读取日志渲染到表格
      ipcRenderer.on('esrganStdout', (m) => {
        changeColumn(m.count, 'status', m.data);
        changeColumn(m.count, 'progress', parseInt(m.data.replace('%', '')));
        console.log(m);
      });

      let exitMsg = await ipcRenderer.invoke('esrgan', {
        count,
        type: 'command',
        path: dataSource[count].path,
        model,
      });

      console.log(count, '退出', exitMsg);
      changeColumn(count, 'status', '完成');
      changeColumn(count, 'progress', 100);
      changeColumn(
        count,
        'process',
        `${dataSource[count].path}_optimization.png`
      );
      //结束后不再监听当列stdout
    }
    setStart(false);
  };

  return (
    <Card
      title="预览"
      headStyle={{
        position: 'sticky',
        top: '60px',
        zIndex: 10,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
      }}
      extra={
        <Space size="small">
          <Button
            onClick={startProcess}
            type="primary"
            loading={start}
            disabled={dataSource.length == 0}
          >
            开始处理
          </Button>
          <Button onClick={handleStop} danger disabled={!start}>
            停止
          </Button>
        </Space>
      }
    >
      <Table
        key="id"
        dataSource={dataSource}
        columns={[
          {
            title: '路径',
            key: 'path',
            dataIndex: 'path',
            width: '20%',
            render: (n, { path }) => (
              <div style={{ wordBreak: 'break-word' }}>{path}</div>
            ),
          },
          {
            title: '原图',
            key: 'origin',
            render: (n, { origin }) => <Image src={origin}></Image>,
            width: '25%',
          },
          {
            title: '处理后',
            key: 'process',
            width: '25%',
            render: (n, { process }) =>
              process && <Image src={process}></Image>,
          },
          {
            title: '状态',
            key: 'status',
            render: (n, { status, progress }) => (
              <>
                <Progress percent={progress} />
                {status}
              </>
            ),
            width: '20%',
          },
          {
            title: '操作',
            key: 'handler',
            render: (n, { id }, index) => (
              <Popconfirm
                title="确认移除？"
                onConfirm={() => {
                  setFiles((prev) => prev.filter((file) => file.uid !== id));
                }}
              >
                <a>移除</a>
              </Popconfirm>
            ),
            width: '10%',
          },
        ]}
      />
    </Card>
  );
}
