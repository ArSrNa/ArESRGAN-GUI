fn main() {
    // 版本号真源是根目录 package.json（tauri.conf.json 的 version 指向它），
    // 显式声明依赖，版本号变更时才会重新生成内嵌的 package_info
    println!("cargo:rerun-if-changed=../package.json");

    tauri_build::build();

    // 记录编译目标 triple，供运行时定位开发模式下的 sidecar 二进制
    if let Ok(target) = std::env::var("TARGET") {
        println!("cargo:rustc-env=ESRGAN_BUILD_TARGET={target}");
    }
}
