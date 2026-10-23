# 2026-10-23 工具鏈準備

- Node：本機 `v24.19.0`；GitHub Actions 固定 `24.21.0`，因此本機不是完全同版 CI。
- pnpm：`COREPACK_HOME=/tmp/kitchen-oct23-corepack corepack pnpm --version` → `12.1.0`。
- 已執行 `COREPACK_HOME=/tmp/kitchen-oct23-corepack corepack pnpm install --frozen-lockfile`，成功安裝 321 packages；`git diff --exit-code -- pnpm-lock.yaml` 成功，未改 lockfile。
- Corepack 預設快取 `/home/agent/.cache/node/corepack/v1` 不可建立，故用明確可寫 `/tmp` 快取，沒有改全域設定。
- WebP：從 Debian 官方 https://deb.debian.org/debian/pool/main/libw/libwebp/webp_1.5.0-0.1_amd64.deb 下載，以 `dpkg-deb -x` 解壓至 `/tmp/kitchen-oct23-webp/root`。`cwebp -version` 與 `dwebp -version` 均為 1.5.0；轉圖命令使用 `PATH=/tmp/kitchen-oct23-webp/root/usr/bin:$PATH`，仍使用 repo 指定原生編碼／解碼工具。未安裝或修改系統套件。原先 `apt-get download webp` 因套件索引不可用而失敗，未重試相同失敗流程。
- Playwright 1.63.0 所需正式 Chromium：`@playwright/test` 的 `chromium.launch()` 回報 `/home/agent/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` 不存在。未重試已知曾截斷的官方下載；不得據本機結果聲稱官方 E2E 通過。
- 系統 Chromium：`/usr/bin/chromium --version` → Chromium 155.0.8059.79（Debian 13）。用 `/tmp` user-data-dir 實啟 headless 時 sandbox 回報 `socket() failed: Operation not permitted`；一次授權外執行仍被環境 wrapper 擋住：`bwrap: Can't create file at /home/agent/.codex/sessions: Read-only file system`。不再重試此限制；未存取該受限路徑。故系統瀏覽器實頁桌機／手機目視 QA 仍未完成，需其他可用瀏覽器介面或如實披露。
- Noto CJK 字型已存在 `/usr/share/fonts/opentype/noto/`。
- 此準備未跑 build、E2E 或部署，未改 repository 程式／設定／權限。

後續命令：

```sh
export COREPACK_HOME=/tmp/kitchen-oct23-corepack
export PATH=/tmp/kitchen-oct23-webp/root/usr/bin:$PATH
corepack pnpm check
corepack pnpm check:content --launch
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm check:merge
```
