import {
    Card, Col, Row, Alert, Image, Upload, Form, Button, Select,
    Table, Progress, Input, Typography, Divider, Space, Popconfirm
} from "antd";
import { InboxOutlined } from '@ant-design/icons';
import { useEffect, useState } from "react";
import { FileUpload } from "./Components";
const { ipcRenderer } = window.electron;
const { Dragger } = Upload;
const { Title, Paragraph } = Typography

export default function Home() {
    const [dataSource, setDataSource] = useState([]);
    const [files, setFiles] = useState([]);
    const [start, setStart] = useState(false);
    const [model, setModel] = useState('realesrgan-x4plus-anime');
    const fileLists = files ? Array.from(new Set(files.map(file => (file.path)))) : [];

    useEffect(() => {
        const tabView = [];
        fileLists.forEach(file => {
            tabView.push({
                origin: file,
                path: file,
                progress: 0,
            })
        });
        setDataSource(tabView);
        // console.log(fileLists, tabView);
    }, [files]);

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
        status(i, status) {
            setDataSource(prevDataSource => {
                const updatedDataSource = [...prevDataSource];
                updatedDataSource[i] = { ...updatedDataSource[i], status };
                return updatedDataSource;
            });
        },

        delete(i) {
            const newData = dataSource.filter(arr => arr !== dataSource[i]);
            setDataSource(newData)
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

    const handleStart = () => {

    }

    const handleStop = () => {
        ipcRenderer.sendMessage('esrgan', { kill: true })
    }

    return (
        <>
            <Space size='middle' direction="vertical">
                <Card title="文件输入配置">
                    <Row gutter={16}>
                        <Col span={10}>
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <FileUpload files={files} setFiles={setFiles} />
                                <Select showSearch
                                    style={{ width: '100%' }}
                                    placeholder="选择模型"
                                    value={model}
                                    onChange={setModel}
                                    options={[{
                                        label: 'realesrgan-x4plus-anime（针对动画图片）',
                                        value: 'realesrgan-x4plus-anime'
                                    }, {
                                        label: 'realesrnet-x4plus（针对一般图片）',
                                        value: 'realesrnet-x4plus'
                                    }]}
                                />
                            </Space>
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

                <Card title="预览"
                    headStyle={{
                        position: 'sticky', top: 60, zIndex: 10, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,.8)'
                    }}
                    extra={<Space size="small">
                        <Button onClick={handleStart} type="primary" loading={start} disabled={fileLists.length == 0}>开始处理</Button>
                        <Button onClick={handleStop} danger disabled={!start}>停止</Button>
                    </Space>}>
                    <Table dataSource={dataSource}
                        columns={[{
                            title: '路径',
                            key: 'path',
                            dataIndex: 'path',
                            width: '20%',
                            ellipsis: true,
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
                            render: (n, { progress, log }) => (<>
                                <Progress percent={progress} />
                                {log}
                            </>),
                            width: '20%',
                        }, {
                            title: '操作',
                            key: 'status',
                            // dataIndex: 'status',
                            render: (n) => (<Popconfirm title="确认移除？" onConfirm={() => {
                                const newData = dataSource.filter(arr => arr !== n);
                                setDataSource(newData)
                            }}>
                                <a>移除</a>
                            </Popconfirm>),
                            width: '10%',
                        }
                        ]} />

                </Card>
            </Space >
        </>
    )
}

