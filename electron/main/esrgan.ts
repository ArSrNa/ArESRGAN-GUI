import { ipcMain } from "electron";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { getAssetPath, mainWindow } from ".";
import os from "os";
import fs from "fs-extra";
import path from "path";

function getExecPath() {
  const macPath = getAssetPath("./realsgan/macos_realesrgan-ncnn-vulkan");
  const windowsPath = getAssetPath("./realsgan/realesrgan-ncnn-vulkan.exe");
  const systemType = os.type();
  /**根据不同系统类型选择不同的可执行文件 */
  return systemType === "Darwin" ? macPath : windowsPath;
}

let esrgan: ChildProcessWithoutNullStreams;
ipcMain.handle(
  "esrgan",
  (
    evt,
    data: {
      filepath: string;
      output: {
        mode: "current" | "custom";
        path?: string;
      };
      model: string;
    }
  ) => {
    const modelPath = getAssetPath("./realsgan/models");

    const { filepath, output, model } = data;
    const filename = path.basename(filepath, path.extname(filepath));
    const executablePath = getExecPath();

    return new Promise((resolve, reject) => {
      console.log(data);

      // 验证输入文件是否存在
      if (!fs.existsSync(filepath)) {
        const error = new Error(`文件不存在：${filepath}`);
        console.error(error.message);
        reject(error);
        return;
      }

      /**自定义模式时，使用传入的路径 */
      const outputPath =
        output.mode === "current"
          ? `${filepath}_opt.png`
          : path.join(output.path, filename + "_opt.png");

      //检查自定义路径是否存在，不存在则新建文件夹
      if (output.mode === "custom" && !fs.existsSync(output.path)) {
        fs.mkdirSync(output.path, { recursive: true });
      }

      const args = [
        "-i",
        filepath,
        "-o",
        outputPath,
        "-m",
        modelPath,
        "-n",
        model,
      ];

      esrgan = spawn(executablePath, args);

      esrgan.stderr.on("data", function (data) {
        console.log(data.toString("utf8"));
        var progressSet = parseInt(data) / 100;
        if (typeof progressSet == "number")
          mainWindow.setProgressBar(progressSet);

        mainWindow.webContents.send("esrgan:stdout", {
          type: "log",
          data: data.toString("utf8"),
          progress: parseInt(data) / 100,
        });
        //return data;
      });

      esrgan.on("error", function (error) {
        console.error("ESRGAN process error:", error);
        mainWindow.setProgressBar(-1);
        mainWindow.webContents.send("esrgan:stderr", {
          type: "error",
          data: `Process error: ${error.message}`,
        });
        reject(error);
      });

      esrgan.on("exit", function (code, signal) {
        mainWindow.setProgressBar(-1);
        console.log("child process exit, code:", code, "signal:", signal);
        mainWindow.webContents.send("esrgan:stderr", {
          type: "exit",
          data: code,
        });
        resolve({
          type: "exit",
          code: code,
          signal: signal,
          output: outputPath,
        });
      });
    });
  }
);

ipcMain.handle("kill-esrgan", () => {
  if (!esrgan) return;
  esrgan.kill("SIGINT");
  esrgan = null;
  mainWindow.setProgressBar(-1);
});
