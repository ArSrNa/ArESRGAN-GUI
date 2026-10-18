fn main() {
    tauri_build::build();

    // 记录编译目标 triple，供运行时定位开发模式下的 sidecar 二进制
    if let Ok(target) = std::env::var("TARGET") {
        println!("cargo:rustc-env=ESRGAN_BUILD_TARGET={target}");
    }
}
