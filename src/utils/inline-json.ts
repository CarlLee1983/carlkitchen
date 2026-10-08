/** 嵌進 <script type="application/json"> 的 JSON，跳脫 < 以免資料提早結束標籤。 */
export const inlineJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
