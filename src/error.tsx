import { useLocation } from "react-router-dom";
import "./App.scss";
import errorImg from "./images/error.png";

export default function Error() {
  const location = useLocation();
  return (
    <div className="flex items-center justify-center h-[60vh] flex-col gap-2">
      <img src={errorImg} className="h-20" />
      <h2 className="text-xl font-bold">前面的区域，以后再来探索吧？</h2>
      <div>页面错误，请确认访问地址是否正确。</div>
      <pre>
        <code>请求路径：{location.pathname}</code>
      </pre>
    </div>
  );
}
