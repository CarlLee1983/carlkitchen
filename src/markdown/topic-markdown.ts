import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { HastNode, HastPluginEntry, HastVisitorContext } from "satteri";

const BODY_IMAGE_SIZES = "(min-width: 43rem) 40rem, calc(100vw - 3rem)";

/** 以文字節點的原有順序包住首字；不複製段落、不插入朗讀用的替身。 */
function markInitial(paragraph: HastNode, context: HastVisitorContext) {
  const textNodes: Extract<HastNode, { type: "text" }>[] = [];
  const collect = (node: HastNode) => {
    if (node.type === "text") textNodes.push(node);
    else if ("children" in node) node.children.forEach(collect);
  };
  collect(paragraph);
  const text = textNodes.map((node) => node.value).join("");
  // 開頭引號維持原尺寸；英文、數字開頭時整段保持一般排版。
  const match = /^(\s*[「『“‘《〈（("']*)(\p{Script=Han})/u.exec(text);
  if (!match) return;
  const prefixEnd = match[1]!.length;
  const initialEnd = prefixEnd + match[2]!.length;
  let offset = 0;
  for (const node of textNodes) {
    if (offset >= initialEnd) break;
    const end = offset + node.value.length;
    const children: HastNode[] = [];
    for (const [start, stop, className] of [
      [0, prefixEnd, "topic-opening"],
      [prefixEnd, initialEnd, "topic-initial"],
      [initialEnd, text.length, ""],
    ] as const) {
      const from = Math.max(start, offset);
      const to = Math.min(stop, end);
      if (from >= to) continue;
      const value = node.value.slice(from - offset, to - offset);
      children.push(
        className
          ? {
              type: "element",
              tagName: "span",
              properties: { className: [className] },
              children: [{ type: "text", value }],
            }
          : { type: "text", value },
      );
    }
    context.replaceNode(node, children);
    offset = end;
  }
}

/** 只處理指定專題集合內的 topic.md；沿用 Astro 原生 Markdown 圖片最佳化。 */
export function topicMarkdown({
  topicsDir,
}: {
  topicsDir: string;
}): HastPluginEntry {
  const root = resolve(topicsDir);
  return ({ fileURL, data, sourceFormat }) => {
    if (!fileURL || sourceFormat !== "markdown") return;
    const parts = relative(root, fileURLToPath(fileURL)).split(sep);
    if (parts.length !== 2 || parts[0] === ".." || parts[1] !== "topic.md")
      return;
    return {
      name: "topic-markdown",
      before(tree, context) {
        if (data.astro?.frontmatter.editorialLayout !== true) return;
        const first = tree.children.find(
          (node) =>
            node.type === "element" &&
            node.tagName === "p" &&
            context.textContent(node).trim(),
        );
        if (first) {
          context.setProperty(first, "className", ["topic-intro"]);
          markInitial(first, context);
        }
      },
      element: {
        filter: ["img"],
        visit(node, context) {
          context.setProperty(node, "layout", "constrained");
          context.setProperty(node, "sizes", BODY_IMAGE_SIZES);
          context.setProperty(node, "loading", "lazy");
          context.setProperty(node, "decoding", "async");
          context.setProperty(node, "fetchpriority", "auto");
          context.setProperty(node, "data-pagefind-ignore", "all");
        },
      },
    };
  };
}
