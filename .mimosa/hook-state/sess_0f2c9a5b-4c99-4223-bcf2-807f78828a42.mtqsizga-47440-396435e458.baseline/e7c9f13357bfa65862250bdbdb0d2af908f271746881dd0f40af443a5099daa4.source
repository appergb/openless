cask "openless" do
  arch arm: "aarch64", intel: "x64"

  version "1.3.18"
  sha256 arm:   "746dde4d4ffa8b4464b2e52b8a73f8e18092215d871e59c6bbf766bfed53fa75",
         intel: "36b9ba5f7926b5bb3ac7f6af3b1f5a75096b9b0f3aebe12581c91876522f2cf4"

  url "https://github.com/Open-Less/openless/releases/download/v#{version}-tauri/OpenLess_#{version}_#{arch}.dmg"
  name "OpenLess"
  desc "Menu-bar voice input layer"
  homepage "https://github.com/Open-Less/openless"

  livecheck do
    url :url
    regex(/^v?(\d+(?:\.\d+)+)[._-]tauri$/i)
  end

  auto_updates true
  depends_on macos: :monterey

  app "OpenLess.app"

  zap trash: [
    "~/Library/Application Support/OpenLess",
    "~/Library/Caches/com.openless.app",
    "~/Library/Logs/OpenLess",
    "~/Library/Preferences/com.openless.app.plist",
    "~/Library/WebKit/com.openless.app",
  ]
end
