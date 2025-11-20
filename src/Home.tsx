import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { DataSourceState, filesState } from "./states";
import { DataSourceType, FormDataType } from "./types";
import "./App.scss";
import { PlusCircleIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

import { FieldGroup, FieldLegend, FieldSet } from "./components/ui/field";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "./components/ui/shadcn-io/dropzone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

const { ipcRenderer, webUtils } = window;

export default function Home() {
  const setDataSource = useSetRecoilState(DataSourceState);
  const form = useForm<FormDataType>();
  const [files, setFiles] = useRecoilState(filesState);
  const [modelList, setModelList] = useState<string[]>([]);

  useEffect(() => {
    /**文件上传后，将文件信息转换为DataSourceType */
    Promise.all(
      files.map(async (file, i) => {
        const path = await webUtils.getPathForFile(file);
        return {
          index: i,
          origin: path,
          path,
          progress: 0,
          status: "等待处理",
        };
      })
    ).then((res) => {
      console.log(res);
      setDataSource(res);
    });
  }, [files]);

  /**
   * @description 设置输出路径
   */
  const handleSetPath = () => {
    ipcRenderer.invoke("selectFolder").then((path) => {
      if (!path) return;
      form.setValue("output.path", path);
    });
  };

  useEffect(() => {
    /**获取模型列表 */
    ipcRenderer
      .invoke("getModels")
      .then((e: { success: boolean; data: string[] }) => {
        if (!e.success) {
          toast.error(e.data);
          return;
        }
        setModelList(e.data.map((m) => m.replace(".param", "")));
        form.setValue("model", e.data[0]);
      });
  }, []);

  const handleDrop = (files: File[]) => {
    // console.log(files);
    setFiles(files);
  };

  return (
    <>
      <div className="flex flex-col gap-4 w-full h-full itens-center justify-center">
        <form className="flex flex-col gap-4 mx-5 my-2">
          <FieldSet>
            <FieldLegend>上传图片</FieldLegend>
            <Dropzone
              accept={{ "image/*": [] }}
              onDrop={handleDrop}
              multiple
              onError={(err) => toast.error(err.message)}
              src={files}
            >
              <DropzoneContent />
            </Dropzone>
          </FieldSet>

          <div className="grid grid-cols-[300px_1fr] gap-20">
            <FieldSet>
              <FieldLegend>选择模型</FieldLegend>
              <Controller
                name="model"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelList?.map((m) => (
                        <SelectItem value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>输出路径</FieldLegend>
              <Controller
                name="output.mode"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <div className="flex items-center space-x-2 h-10">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label className="w-30" htmlFor="custom">
                        自定义路径
                      </Label>
                      {form.watch("output.mode") === "custom" && (
                        <Input
                          value={form.watch("output.path")}
                          placeholder="点击选择输出路径"
                          readOnly
                          className="cursor-pointer"
                          onClick={handleSetPath}
                        />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="current" id="current" />
                      <Label htmlFor="current">原文件路径</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </FieldSet>
          </div>

          <Button type="submit" className="w-full mt-3">
            开始处理
          </Button>
        </form>

        {/* <Card title="文件输入配置">
          <Form
            form={form}
            onFinish={console.log}
            initialValues={{
              model: "realesrgan-x4plus-anime",
              output: {
                mode: "current",
              },
            }}
            layout="horizontal"
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
                  <PlusCircleIcon />
                </p>
                <p className="ant-upload-text">点击此处或拖入文件以上传</p>
              </Dragger>
            </Form.Item>
            <Form.Item name="model" label="选择模型">
              <Select
                showSearch
                style={{ width: "100%" }}
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

            <Form.Item dependencies={[["output", "mode"]]} noStyle>
              {() => {
                const outputMode = form.getFieldValue(["output", "mode"]);
                if (outputMode === "custom") {
                  return (
                    <Form.Item
                      rules={[{ required: true, message: "请选择输出路径" }]}
                      name={["output", "path"]}
                      label="输出路径"
                    >
                      <Input onClick={handleSetPath} readOnly />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>
          </Form>
        </Card> */}

        {/* <TView model={model} form={form} /> */}
      </div>
    </>
  );
}

// function TView({ model, form }: { model: string; form: FormInstance<any> }) {
//   const setFiles = useSetRecoilState(filesState);
//   const [start, setStart] = useState(false);
//   const [dataSource, setDataSource] = useRecoilState(DataSourceState);

//   function changeColumn(i: number, key: keyof DataSourceType, value: any) {
//     setDataSource((prevDataSource) => {
//       const updatedDataSource = [...prevDataSource];
//       updatedDataSource[i] = { ...updatedDataSource[i], [key]: value };
//       return updatedDataSource;
//     });
//   }

//   const handleStop = async () => {
//     await ipcRenderer.invoke("esrgan", { type: "kill" });
//     setStart(false);
//   };

//   /**处理超分辨率（批量） */
//   const startProcess = async () => {
//     const { output } = form.getFieldsValue();
//     for (let count = 0; count < dataSource.length; count++) {
//       setStart(true);
//       console.log(count, "开始处理");

//       //读取日志渲染到表格
//       ipcRenderer.on("esrganStdout", (e, m) => {
//         changeColumn(m.count, "status", m.data);
//         changeColumn(m.count, "progress", parseInt(m.data.replace("%", "")));
//         console.log(m);
//       });

//       let exitMsg = await ipcRenderer.invoke("esrgan", {
//         count,
//         type: "command",
//         filepath: dataSource[count].path,
//         model,
//         output,
//       });

//       console.log(count, "退出", exitMsg);
//       changeColumn(count, "status", "完成");
//       changeColumn(count, "progress", 100);
//       changeColumn(count, "process", exitMsg.output);
//       //结束后不再监听当列stdout
//     }
//     setStart(false);
//   };

//   return (
//     <Card
//       title="预览"
//       styles={{
//         header: {
//           position: "sticky",
//           top: "60px",
//           zIndex: 10,
//           backdropFilter: "blur(10px)",
//           backgroundColor: "rgba(255, 255, 255, 0.8)",
//         },
//       }}
//       extra={
//         <Space size="small">
//           <Button
//             onClick={startProcess}
//             type="primary"
//             loading={start}
//             disabled={dataSource.length == 0}
//           >
//             开始处理
//           </Button>
//           <Button onClick={handleStop} danger disabled={!start}>
//             停止
//           </Button>
//         </Space>
//       }
//     >
//       <Table
//         key="id"
//         dataSource={dataSource}
//         columns={[
//           {
//             title: "路径",
//             key: "path",
//             dataIndex: "path",
//             width: "20%",
//             render: (n, { path }) => (
//               <div style={{ wordBreak: "break-word" }}>{path}</div>
//             ),
//           },
//           {
//             title: "原图",
//             key: "origin",
//             render: (n, { origin }) => <Image src={`file://${origin}`}></Image>,
//             width: "25%",
//           },
//           {
//             title: "处理后",
//             key: "process",
//             width: "25%",
//             render: (n, { process }) =>
//               process && <Image src={`file://${process}`}></Image>,
//           },
//           {
//             title: "状态",
//             key: "status",
//             render: (n, { status, progress }) => (
//               <>
//                 <Progress percent={progress} />
//                 {status}
//               </>
//             ),
//             width: "20%",
//           },
//           {
//             title: "操作",
//             key: "handler",
//             render: (n, { id }, index) => (
//               <Popconfirm
//                 title="确认移除？"
//                 onConfirm={() => {
//                   setFiles((prev) => prev.filter((file) => file.uid !== id));
//                 }}
//               >
//                 <a>移除</a>
//               </Popconfirm>
//             ),
//             width: "10%",
//           },
//         ]}
//       />
//     </Card>
//   );
// }
