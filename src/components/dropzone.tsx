import { UploadIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";


export function Dropzone(
    props: React.InputHTMLAttributes<HTMLInputElement> & {
        files?: File[];
        onFileChange?: (files: File[]) => void;
    },
) {
    const { onFileChange, files, ...inputProps } = props;
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!inputRef.current) return;
        inputRef.current.value = "";
    }, [files]);

    return <div
        className="w-full h-40 border border-dashed select-none border-gray-300 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-muted-foreground cursor-pointer gap-3"
        onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
        }}
        onClick={() => {
            inputRef.current?.click();
        }}
        onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const fileList = Array.from(e.dataTransfer.files).filter((f) =>
                f.type.startsWith("image/")
            );
            if (fileList.length === 0) {
                toast.error("请拖入图片文件");
                return;
            }
            onFileChange?.(fileList);
        }}
    >
        <UploadIcon className="size-6" />
        拖入图片或点击上传
        <input className="sr-only" onChange={(e) => {
            onFileChange?.(Array.from(e.target.files));
        }} type="file" {...inputProps} ref={inputRef} />
    </div>
}
