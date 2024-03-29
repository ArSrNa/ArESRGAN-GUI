import './App.css';
import { useRef, useState, useEffect } from 'react';

export function ArLoadLine() {
    return (
        <div className="ArLoadLine">
            <div className="ani"></div>
        </div>
    )
}

export function FileUpload({ files, setFiles }) {
    const fileInputField = useRef(null);
    const [dragging, setDragging] = useState(false);

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
        setDragging(false)
        const fileList = event.dataTransfer.files;
        validateAndSetFiles(fileList);
    };

    const validateAndSetFiles = (fileList) => {
        // 过滤出图像文件
        const imageFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
        setFiles((prevFiles) => [...prevFiles, ...imageFiles]);
    };

    return (<>
        <div className="dragUpload" onDragOver={handleDragOver} onDrop={handleDrop}>
            {dragging ?
                '松开鼠标以上传' :
                <>拖拽文件到此 或
                    <a style={{ color: 'royalblue' }} onClick={() => fileInputField.current.click()}>选择文件</a>
                    上传</>}

        </div>
        <input type="file" ref={fileInputField} style={{ display: 'none' }} onInput={handleFileInputChange} multiple accept='image/*' />
    </>)

}

export function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}