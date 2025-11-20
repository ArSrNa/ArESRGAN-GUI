import { useEffect, useRef, useState } from "react";
import { useRecoilState } from "recoil";
import { filesState } from "./states";
import { FormDataType } from "./types";
import "./App.scss";
import { PauseCircleIcon, PlayCircleIcon, Trash2Icon } from "lucide-react";
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { FieldLegend, FieldSet } from "./components/ui/field";
import { Dropzone, DropzoneContent } from "./components/ui/shadcn-io/dropzone";
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
  const form = useForm<FormDataType>({
    defaultValues: {
      model: "realesrgan-x4plus-anime",
      output: {
        mode: "current",
        path: "",
      },
    },
  });
  const [files, setFiles] = useRecoilState(filesState);
  const [modelList, setModelList] = useState<string[]>([]);

  useEffect(() => form.setValue("files", files), [files]);

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
        const data = e.data.map((m) => m.replace(".param", ""));
        setModelList(data);
      });
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4 itens-center justify-center">
        <form className="grid grid-cols-[450px_1fr] gap-20">
          <FieldSet>
            <FieldLegend>上传图片</FieldLegend>
            <Dropzone
              accept={{ "image/*": [] }}
              onDrop={setFiles}
              multiple
              maxFiles={null}
              maxSize={null}
              onError={(err) => toast.error(err.message)}
              src={files}
            >
              <DropzoneContent />
            </Dropzone>
          </FieldSet>

          <div className="flex flex-col gap-5">
            <FieldSet>
              <FieldLegend>选择模型</FieldLegend>
              <Controller
                name="model"
                control={form.control}
                rules={{ required: true }}
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
                rules={{ required: true }}
                name="output.mode"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    className="flex"
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

        <TView form={form} />
      </div>
    </>
  );
}

function TView({ form }: { form: UseFormReturn<FormDataType> }) {
  const [files, setFiles] = useRecoilState(filesState);
  const [start, setStart] = useState(false);
  const [srcs, setSrcs] = useState<string[]>([]);
  const stop = useRef(false);
  const [current, setCurrent] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!files.length) return setSrcs([]);
    /**文件上传后，将文件信息转换为DataSourceType */
    Promise.all(
      files.map(async (file, i) => await webUtils.getPathForFile(file))
    ).then((res) => {
      setSrcs(res);
    });
  }, [files]);

  useEffect(() => {
    function onLog(e: Electron.IpcRendererEvent, m: any) {
      setProgress(parseInt(m.data.replace("%", "")));
      console.log(m);
    }
    //读取日志
    ipcRenderer.on("esrgan:stdout", onLog);
    return () => {
      ipcRenderer.off("esrgan:stdout", onLog);
    };
  }, []);

  async function handleSubmit(data: FormDataType) {
    console.log(data);
    stop.current = false;
    const output = data?.output;
    const model = data?.model;
    for (let count = 0; count < files.length; count++) {
      if (stop.current) break;
      setStart(true);
      console.log(count, "开始处理");
      setCurrent(count);
      let exitMsg = await ipcRenderer.invoke("esrgan", {
        filepath: srcs[count],
        model,
        output,
      });
      console.log(count, "退出", exitMsg);
    }
    setStart(false);
  }

  const handleStop = async () => {
    await ipcRenderer.invoke("kill-esrgan");
    stop.current = true;
    setStart(false);
  };

  return (
    <>
      <div className="sticky top-15 z-20 grid grid-cols-2 gap-3 my-3">
        {!start && (
          <Button
            disabled={srcs.length === 0 || start}
            onClick={form.handleSubmit(handleSubmit)}
          >
            <PlayCircleIcon /> 开始
          </Button>
        )}
        {start && (
          <Button onClick={handleStop}>
            <PauseCircleIcon /> 停止
          </Button>
        )}
        <Button
          disabled={srcs.length === 0 || start}
          onClick={() => {
            setFiles([]);
          }}
        >
          <Trash2Icon /> 清空
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 border items-center justify-center rounded-lg p-3 min-h-30 overflow-y-auto">
        {srcs?.map((m, i) => (
          <div key={"preview_" + m} className="w-40 h-40 relative">
            {start && current <= i && (
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 text-white flex items-center justify-center rounded-lg z-10">
                {current === i && <>处理中 {progress}%</>}
                {current < i && <>等待处理</>}
              </div>
            )}
            <img
              src={"file://" + m}
              alt={m}
              data-current={start && current <= i}
              draggable={false}
              className="w-full h-full object-contain border rounded-lg data-[current=true]:blur-xs"
            />
            {!start && (
              <div className="bg-black/50 absolute bottom-0 rounded-b-lg right-0 left-0 py-1 z-10 flex items-center justify-center">
                <Trash2Icon
                  className="right-0 bottom-0 size-4 cursor-pointer"
                  onClick={(e) => {
                    setFiles((s) => s.toSpliced(i, 1));
                  }}
                  color="white"
                />
              </div>
            )}
          </div>
        ))}

        {srcs?.length === 0 && <div>暂无图片</div>}
      </div>
    </>
  );
}
