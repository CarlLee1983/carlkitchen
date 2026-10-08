# 04: 手機量測反映截斷後的頁面

**What to build:** 站主跑 `pnpm measure:mobile` 時，量到的是讀者實際看得到的清單：列數與頁面高度只計可見列，報告另列總列數，方便和截斷前比較。

**Blocked by:** 01（「全部」清單的顯示更多）

**Status:** ready-for-agent

- [ ] 報告的列數、列高與一屏列數只計可見列
- [ ] 報告新增總列數欄位
- [ ] 頁面總高度反映截斷後的頁面
- [ ] 以正式內容 `pnpm build && pnpm measure:mobile` 實測一次，結果貼在 PR 說明
