import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import "./App.scss";
import Home from "./Home";
import Error from "./error";
import Copyright from "./Copyright";
import { RecoilRoot } from "recoil";
import FAQ from "./faq";
import { Toaster } from "@/components/ui/sonner";
import { Navbar1 } from "./components/navbar1";
import { Separator } from "./components/ui/separator";
import { CheckUpdate } from "./utils";
import { ErrorBoundary } from "./components/ErrorBoundary";

declare global {
  interface Window {
    // expose in the `electron/preload/index.ts`
    ipcRenderer: import("electron").IpcRenderer;
    webUtils: {
      getPathForFile: (file: File) => Promise<string>;
    };
  }
}

function Main() {
  useEffect(() => {
    CheckUpdate();
  }, []);
  return (
    <ErrorBoundary>
      <div>
        <Toaster position="top-center" />
        <Navbar1 />
        <div className="min-h-[80vh]" style={{ padding: "80px 20px 0px 20px" }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/os" element={<Copyright />} />
              {/* <Route path='/start' element={<Start />} /> */}
              <Route path="*" element={<Error />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <div className="text-center flex items-center justify-center gap-2 py-2 text-sm text-gray-600">
          Powered by Ar-Sr-Na
          <Separator orientation="vertical" />
          上海绫中信息技术有限公司
          <Separator orientation="vertical" />
          GNU协议 禁止用于商业用途！
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => {
    console.log("Powered by Ar-Sr-Na");
    console.log("https://www.arsrna.cn/");
    console.log(`
    ####    ##                    #         
    #        #                              
    ###      #    #  #   ####    ##     ### 
    #        #    #  #   ##       #    #  # 
    #        #    ## #     ##     #    #  # 
    ####    ###     ##   ####    ###    ####
                  #  #
                   ##
    `);
    console.warn("我永远喜欢爱莉希雅！");
  }, []);
  return (
    <Router>
      <RecoilRoot>
        <Main />
      </RecoilRoot>
    </Router>
  );
}
