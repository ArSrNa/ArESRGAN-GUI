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
  Input,
  Radio,
  FormInstance,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { DataSourceState, filesState } from './states';
import { DataSourceType, FormDataType } from './types';
import './App.scss';

const { ipcRenderer, webUtils } = window;
const { Dragger } = Upload;

export default function Home() {
  const setDataSource = useSetRecoilState(DataSourceState);
  const [form] = Form.useForm<FormDataType>();
  /**存储模式，当前目录或自定义目录 */
  // const [isCurrent, setIsCurrent] = useState('current');
  const [model, setModel] = useState('realesrgan-x4plus-anime');
  const [files, setFiles] = useRecoilState(filesState);
  const [modelList, setModelList] = useState([]);

  useEffect(() => {
    /**文件上传后，将文件信息转换为DataSourceType */
    Promise.all(files.map(async (fileObj) => {
      const file = fileObj.originFileObj;
      const { uid } = file;
      const path = await webUtils.getPathForFile(file);
      return {
        id: uid,
        origin: path,
        path,
        progress: 0,
        status: '等待处理',
      };
    })).then(res => {
      console.log(res);
      setDataSource(res);
    });
  }, [files]);

  /**
   * @description 设置输出路径
   */
  const handleSetPath = () => {
    ipcRenderer.invoke('setPath').then((path) => {
      form.setFieldsValue({ output: { path } });
    });
  };

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
          <Form
            form={form}
            onFinish={console.log}
            initialValues={{
              model: 'realesrgan-x4plus-anime',
              output: {
                mode: 'current',
              },
            }}
            layout="horizontal"
          >
            <Form.Item label="文件">
              <Dragger
                onChange={(e) => setFiles(e.fileList)}
                fileList={files}
                customRequest={() => { }}
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

            <Form.Item label="输出路径" name={["output", "mode"]}>
              <Radio.Group>
                <Radio value="custom">自定义路径</Radio>
                <Radio value="current">当前路径</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item dependencies={[['output', 'mode']]} noStyle>
              {() => {
                const outputMode = form.getFieldValue(['output', 'mode']);
                if (outputMode === 'custom') {
                  return (<Form.Item rules={[{ required: true, message: '请选择输出路径' }]}
                    name={['customPath', 'path']} label="输出路径"
                  >
                    <Input
                      onClick={handleSetPath}
                      readOnly
                    />
                  </Form.Item>);
                }
                return null;
              }}
            </Form.Item>

          </Form>

        </Card>

        <TView model={model} form={form} />
      </Space >
    </>
  );
}

function TView({ model, form }: {
  model: string,
  form: FormInstance<any>;
}) {
  const setFiles = useSetRecoilState(filesState);
  const [start, setStart] = useState(false);
  const [dataSource, setDataSource] = useRecoilState(DataSourceState);

  function changeColumn(i: number, key: keyof DataSourceType, value: any) {
    setDataSource((prevDataSource) => {
      const updatedDataSource = [...prevDataSource];
      updatedDataSource[i] = { ...updatedDataSource[i], [key]: value };
      return updatedDataSource;
    });
  }

  const handleStop = async () => {
    await ipcRenderer.invoke('esrgan', { type: 'kill' });
    setStart(false);
  };

  /**处理超分辨率（批量） */
  const startProcess = async () => {
    const { output } = form.getFieldsValue();

    // console.log(outputMode, customPath);
    // return;
    for (let count = 0; count < dataSource.length; count++) {
      setStart(true);
      console.log(count, '开始处理');

      //读取日志渲染到表格
      ipcRenderer.on('esrganStdout', (e, m) => {
        changeColumn(m.count, 'status', m.data);
        changeColumn(m.count, 'progress', parseInt(m.data.replace('%', '')));
        console.log(m);
      });

      let exitMsg = await ipcRenderer.invoke('esrgan', {
        count,
        type: 'command',
        filepath: dataSource[count].path,
        model,
        output,
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
      styles={{
        header: {
          position: 'sticky',
          top: '60px',
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
        }
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
            render: (n, { origin }) => <Image src={`file://${origin}`}></Image>,
            width: '25%',
          },
          {
            title: '处理后',
            key: 'process',
            width: '25%',
            render: (n, { process }) =>
              process && <Image src={`file://${process}`}></Image>,
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
