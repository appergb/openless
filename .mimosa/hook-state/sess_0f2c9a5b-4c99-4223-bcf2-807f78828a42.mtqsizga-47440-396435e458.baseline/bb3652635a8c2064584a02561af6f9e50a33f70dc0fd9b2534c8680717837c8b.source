pub(crate) fn classify_target_os(target: &str, cargo_cfg_target_os: Option<&str>) -> &'static str {
    match cargo_cfg_target_os {
        Some("android") => "android",
        Some("macos") => "macos",
        Some("linux") => "linux",
        Some(_) => "",
        None if target.contains("-android") || target.contains("-androideabi") => "android",
        None if target.ends_with("-apple-darwin") => "macos",
        None if target.contains("-linux-") => "linux",
        None => "",
    }
}

#[cfg(test)]
mod tests {
    use super::classify_target_os;

    #[test]
    fn cargo_target_os_classifies_android_triples() {
        for target in [
            "aarch64-linux-android",
            "armv7-linux-androideabi",
            "i686-linux-android",
            "x86_64-linux-android",
        ] {
            assert_eq!(classify_target_os(target, Some("android")), "android");
        }
    }

    #[test]
    fn cargo_target_os_classifies_desktop_targets() {
        assert_eq!(
            classify_target_os("x86_64-unknown-linux-gnu", Some("linux")),
            "linux"
        );
        assert_eq!(
            classify_target_os("aarch64-apple-darwin", Some("macos")),
            "macos"
        );
    }

    #[test]
    fn fallback_classifies_legacy_target_triples() {
        assert_eq!(
            classify_target_os("armv7-linux-androideabi", None),
            "android"
        );
        assert_eq!(
            classify_target_os("x86_64-unknown-linux-gnu", None),
            "linux"
        );
    }
}
