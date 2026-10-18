fn main() {
    let target = std::env::var("TARGET").expect("缺少 Rust 编译目标");
    assert!(
        !target.ends_with("apple-darwin") || target == "aarch64-apple-darwin",
        "macOS 仅支持 Apple Silicon，请使用 --target aarch64-apple-darwin"
    );
    // 版本号真源是根目录 package.json（tauri.conf.json 的 version 指向它），
    // 显式声明依赖，版本号变更时才会重新生成内嵌的 package_info
    println!("cargo:rerun-if-changed=../package.json");

    tauri_build::build();

    // 记录编译目标 triple，供运行时定位开发模式下的 sidecar 二进制
    println!("cargo:rustc-env=ESRGAN_BUILD_TARGET={target}");
}
