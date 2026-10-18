import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import "./App.scss";
import Home from "./Home";
import Error from "./error";
import Copyright from "./Copyright";
import { Toaster } from "@/components/ui/sonner";
import { Navbar1 } from "./components/navbar1";
import { Separator } from "./components/ui/separator";
import { CheckUpdate } from "./utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { openExternal } from "./lib/desktop";

function Main() {
  useEffect(() => {
    CheckUpdate();
  }, []);

  /**
   * 所有 http(s) 链接交给系统浏览器，主窗口不导航到远程站点。
   */
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }
      const href = anchor.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href)) {
        return;
      }
      event.preventDefault();
      openExternal(href).catch((error) =>
        console.error("打开外部链接失败:", error)
      );
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
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
              <Route path="/os" element={<Copyright />} />
              <Route path="*" element={<Error />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <div className="text-center flex items-center justify-center gap-2 py-2 text-sm text-gray-600 mt-5">
          Powered by Ar-Sr-Na
          <Separator orientation="vertical" />
          上海绫中信息技术有限公司
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
      <Main />
    </Router>
  );
}
