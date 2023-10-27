import {
    Card, Col, Row, Alert, Image, Upload, Form, Button, Select,
    Table, Progress, Divider, Typography, message, Space, Popconfirm, Input, Checkbox, Radio
} from "antd";
import { PlusOutlined, InboxOutlined } from '@ant-design/icons';
import { useEffect, useState } from "react";
import { FileUpload } from "./Components";
const { ipcRenderer } = window.electron;
const { Dragger } = Upload;
const { Title, Paragraph } = Typography

export default function Home() {
    const [dataSource, setDataSource] = useState([]);
    const [form] = Form.useForm();
    const [isCurrent, setIsCurrent] = useState('current');
    const [model, setModel] = useState('');
    const [files, setFiles] = useState([]);
    const [modelList, setModelList] = useState([]);
    // const fileLists = files ? Array.from(new Set(files.map(file => (file.path)))) : [];
    useEffect(() => {
        const tabView = [];
        files.forEach(fileObj => {
            // console.log(file);
            const file = fileObj.originFileObj
            tabView.push({
                origin: file.path,
                path: file.path,
                progress: 0,
            })
        });
        setDataSource(tabView);
        // console.log(fileLists);
    }, [files]);

    const handleSetPath = () => {
        form.setFieldValue('customPath', {
            path: '我永远喜欢爱莉希雅',
            type: isCurrent
        });
    }

    useEffect(() => {
        ipcRenderer.sendMessage('getModels');
        ipcRenderer.on('getModels', e => {
            if (!e.success) {
                message.error(e.data);
                return;
            }
            setModelList(e.data);
        })
    }, [])

    return (
        <>
            <Space size='middle' direction="vertical" style={{ width: '100%' }}>
                <Card title="文件输入配置">
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form
                                form={form}
                                onFinish={console.log}
                                initialValues={{
                                    model: 'realesrgan-x4plus-anime',
                                    customPath: {
                                        type: 'current'
                                    }
                                }}
                                layout="vertical">
                                <Form.Item label="文件">
                                    <Dragger
                                        onChange={(e) => setFiles(e.fileList)}
                                        customRequest={console.log}
                                        showUploadList={false}
                                        multiple accept="image/*">
                                        <p className="ant-upload-drag-icon">
                                            <InboxOutlined />
                                        </p>
                                        <p className="ant-upload-text">点击此处或拖入文件以上传</p>
                                    </Dragger>
                                </Form.Item>
                                <Form.Item name="model" label="模型">
                                    <Select showSearch
                                        dropdownRender={(menu) => (
                                            <>
                                                {menu}
                                                <Divider
                                                    style={{
                                                        margin: '8px 0',
                                                    }}
                                                />
                                                <Button disabled type="text" icon={<PlusOutlined />}>
                                                    导入自定义模型（下版本开放）
                                                </Button>
                                            </>
                                        )}
                                        style={{ width: '100%' }}
                                        placeholder="选择模型"
                                        options={modelList}
                                    />
                                </Form.Item>

                                <Form.Item label="输出路径" >
                                    <Space.Compact style={{ width: '100%' }}>
                                        <Form.Item noStyle name={["customPath", "type"]}>
                                            <Select style={{ width: 150 }} onChange={setIsCurrent}>
                                                <Option value="custom">自定义路径</Option>
                                                <Option value="current">当前路径</Option>
                                            </Select>
                                        </Form.Item>
                                        <Form.Item noStyle name={["customPath", "path"]}>
                                            <Input
                                                onClick={() => {
                                                    if (isCurrent === 'custom') {
                                                        handleSetPath();
                                                    }
                                                }}
                                                readOnly
                                                placeholder={isCurrent === 'custom' ? '单击进行更改' : ''} />
                                        </Form.Item>
                                    </Space.Compact>
                                </Form.Item>
                            </Form>
                        </Col>

                        <Col span={14}>
                            <Alert
                                message="软件缺陷"
                                description={
                                    <>目前在想办法自定义输出目录，但是没有思路；欢迎去<a href="https://github.com/ArSrNa/ArESRGAN-GUI" target="_blank">github</a>或兔小巢（软件顶栏反馈处）上提交您的建议！
                                        <br />还有，希望大家能在github上多多点下star!!!</>
                                }
                                type="info"
                                showIcon
                            />
                        </Col>
                    </Row>
                </Card>

                <TView
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    fileLists={files}
                    model={model}
                    files={files}
                    setFiles={setFiles} />

            </Space >
        </>
    )
}

function TView({
    dataSource, fileLists, setDataSource, model
}) {
    const [start, setStart] = useState(false);
    const changeColumn = {
        path(i, path) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], path };
                return updatedDataSource;
            });
        },
        origin(i, origin) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], origin };
                return updatedDataSource;
            });
        },
        process(i, process) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], process };
                return updatedDataSource;
            });
        },
        progress(i, progress) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], progress };
                return updatedDataSource;
            });
        },
        status(i, status) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], status };
                return updatedDataSource;
            });
        },

        delete(i) {
            const newData = dataSource.filter(arr => arr !== dataSource[i]);
            setDataSource(newData);
        }
    }

    const mock = [{
        origin: 'A:/stable-diffusion-webui/outputs/txt2img-images/2023-07-08/00000-1613037609.png',
        process: '',
        path: 'D:/xxx/xxx/xxx',
        progress: parseInt('100%'.replace('%', '')),
        log: 'exit0'
    }, {
        origin: 'A:/stable-diffusion-webui/outputs/txt2img-images/2023-07-08/00001-2967784565.png',
        process: '',
        path: 'D:/xxx/xxx/xxx',
        progress: parseInt('100%'.replace('%', '')),
        log: 'exit0'
    }]

    const handleStop = () => {
        ipcRenderer.sendMessage('esrgan', { kill: true });
        setStart(false);
    }

    const startProcess = () => {
        var count = 0;
        setStart(true);
        sendCommand(count);
        ipcRenderer.on('esrganStdout', m => {
            changeColumn.status(count, m.data);
            changeColumn.progress(count, parseInt(m.data.replace('%', '')));
            console.log(m);
        })

        ipcRenderer.on('esrganExit', m => {
            changeColumn.status(count, '完成');
            changeColumn.progress(count, 100);
            changeColumn.process(count, `${dataSource[count].path}_optimization.png`);
            count++
            if (count >= dataSource.length) {
                setStart(false);
                return;
            }
            sendCommand(count);
        })
    }

    const sendCommand = (i) => {
        console.log(i);
        ipcRenderer.sendMessage('esrgan', {
            command: true,
            path: dataSource[i].path,
            model,
        })
    }

    return (
        <Card title="预览"
            headStyle={{
                position: 'sticky', top: 60, zIndex: 10, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,.8)'
            }}
            extra={<Space size="small">
                <Button onClick={startProcess} type="primary" loading={start} disabled={fileLists.length == 0}>开始处理</Button>
                <Button onClick={handleStop} danger disabled={!start}>停止</Button>
            </Space>}>
            <Table dataSource={dataSource}
                columns={[{
                    title: '路径',
                    key: 'path',
                    dataIndex: 'path',
                    width: '20%',
                    render: (n, { path }) => (<div style={{ wordBreak: 'break-word' }}>{path}</div>)
                }, {
                    title: '原图',
                    key: 'origin',
                    render: (n, { origin }) => (<Image src={origin}></Image>),
                    width: '25%'
                }, {
                    title: '处理后',
                    key: 'process',
                    width: '25%',
                    render: (n, { process }) => (process ? <Image src={process}></Image> : '等待处理'),
                }, {
                    title: '状态',
                    key: 'status',
                    // dataIndex: 'status',
                    render: (n, { status, progress }) => (<>
                        <Progress percent={progress} />
                        {status}
                    </>),
                    width: '20%',
                }, {
                    title: '操作',
                    key: 'status',
                    // dataIndex: 'status',
                    render: (n) => (<Popconfirm title="确认移除？" onConfirm={() => {
                        const newData = dataSource.filter(arr => arr !== n);
                        setDataSource(newData);
                    }}>
                        <a>移除</a>
                    </Popconfirm>),
                    width: '10%',
                }
                ]} />

        </Card>
    )
}
