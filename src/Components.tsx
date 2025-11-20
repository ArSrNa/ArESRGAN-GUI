import "./App.scss";
import { useRef, useState, useEffect } from "react";

export function ArLoadLine() {
  return (
    <div className="ArLoadLine">
      <div className="ani"></div>
    </div>
  );
}

/**
 * @deprecated 已使用的Upload组件代替
 */
export function FileUpload({ files, setFiles }) {
  const fileInputField = useRef(null);
  const [dragging, setDragging] = useState(false);

  /**输入文件并检查 */
  const handleFileInputChange = (event) => {
    const fileList = event.target.files;
    validateAndSetFiles(fileList);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const fileList = event.dataTransfer.files;
    validateAndSetFiles(fileList);
  };

  /**
   * @description 过滤文件，仅筛选出MIME开头为image/的文件
   * @param fileList 文件列表
   */
  const validateAndSetFiles = (fileList: File[]) => {
    // 过滤出图像文件
    const imageFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );
    setFiles((prevFiles) => [...prevFiles, ...imageFiles]);
  };

  return (
    <>
      <div
        className="dragUpload"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragging ? (
          "松开鼠标以上传"
        ) : (
          <>
            拖拽文件到此 或
            <a
              style={{ color: "royalblue" }}
              onClick={() => fileInputField.current.click()}
            >
              选择文件
            </a>
            上传
          </>
        )}
      </div>
      <input
        type="file"
        ref={fileInputField}
        style={{ display: "none" }}
        onInput={handleFileInputChange}
        multiple
        accept="image/*"
      />
    </>
  );
}
