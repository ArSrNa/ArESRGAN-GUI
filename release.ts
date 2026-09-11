import { valid } from "semver";
import { version } from "./package.json";

if (!version || !valid(version)) {
  throw new Error("package.json 中的 version 不是有效的 semver 版本号");
}

console.log(JSON.stringify({ version }, null, 2));
console.log("请将此 version 写入更新接口（api-gz.arsrna.cn），并设置对应的 link 下载链接");
