import { join } from "node:path";
import { z } from "astro/zod";
import {
  createTopicSchema,
  TOPIC_ID_PATTERN,
} from "../content/topic-schema.ts";
import { parseTopicSourceRecord } from "../content/topic-sources.ts";
import { checkHeroAlt, checkImageFile } from "./images.ts";
import {
  listDirectories,
  listSourceIds,
  listUnrecognizedSourceFiles,
  readImageInfo,
  readMarkdown,
  readYaml,
} from "./io.ts";
import type { Issue } from "./issue.ts";
import { sourceCore } from "./leaks.ts";
import { checkTerms, checkTermsInText } from "./terms.ts";

const schema = createTopicSchema(z.string());

type Topic = z.output<typeof schema>;

/** 選題參考的作者與標題是原文引用，不受用詞表約束。 */
const REFERENCE_TEXT = /^references\.\d+\.(?:title|author)$/;

export interface TopicCheckOptions {
  topicsDir: string;
  topicSourcesDir: string;
  publicRecipeIds: readonly string[];
  publicIngredientIds: readonly string[];
}

/** 一份通過驗證的來源紀錄：核准來源網址與段落對照的小節標題。 */
interface SourceRecord {
  approvedUrls: string[];
  sectionHeadings: string[];
}

interface Heading {
  level: number;
  text: string;
}

/** 內文裡 `##`、`###` 標題的純文字；略過程式碼區塊（收尾 fence 須同字元且不短於開頭，CommonMark）。 */
export function bodyHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  let fence: { char: string; length: number } | null = null;
  for (const line of body.split(/\r?\n/)) {
    const run = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      const closing = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line)?.[1];
      if (
        closing &&
        closing[0] === fence.char &&
        closing.length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }
    if (run) {
      fence = { char: run[1]![0]!, length: run[1]!.length };
      continue;
    }
    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.push({ level: match[1]!.length, text: match[2]! });
  }
  return headings;
}

type PageKind = "recipes" | "ingredients" | "topics";

/** 內文（略過程式碼區塊與行內程式碼）裡指向菜譜、食材條目、專題頁的站內連結，含 Markdown 連結與 HTML href。 */
export function bodyInternalLinks(
  body: string,
): { href: string; kind: PageKind; id: string }[] {
  const prose = body
    .replace(
      /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n {0,3}\1[`~]*[ \t]*(?=\n|$)|$)/gm,
      "",
    )
    .replace(/`[^`\n]*`/g, "");
  const links: { href: string; kind: PageKind; id: string }[] = [];
  for (const match of prose.matchAll(
    /(?:\]\(\s*|\bhref=["'])(\/(recipes|ingredients|topics)\/([^/)\s"'#?]+)[^)\s"']*)/g,
  )) {
    links.push({
      href: match[1]!,
      kind: match[2] as PageKind,
      id: match[3]!,
    });
  }
  return links;
}

/** 已發布專題內文的站內連結只能指向已發布的菜譜、食材條目與專題。 */
function checkBodyLinks(
  id: string,
  file: string,
  body: string,
  published: Record<PageKind, ReadonlySet<string>>,
): Issue[] {
  return bodyInternalLinks(body).flatMap((link) =>
    published[link.kind].has(link.id)
      ? []
      : [
          {
            topic: id,
            file,
            field: "body",
            message: `內文連結 ${link.href} 指向的${PAGE_LABELS[link.kind]}「${link.id}」不存在或尚未發布。`,
          },
        ],
  );
}

const PAGE_LABELS: Record<PageKind, string> = {
  recipes: "菜譜",
  ingredients: "食材條目",
  topics: "專題",
};

/** 讀取每份來源紀錄；回報孤兒、壞格式與無法辨識的檔案。 */
function readSourceRecords(
  dir: string,
  topicIds: ReadonlySet<string>,
): {
  issues: Issue[];
  fileIds: Set<string>;
  records: Map<string, SourceRecord>;
  urls: string[];
} {
  const issues: Issue[] = [];
  const records = new Map<string, SourceRecord>();
  const urls: string[] = [];
  const fileIds = new Set(listSourceIds(dir));
  for (const id of fileIds) {
    const file = join(dir, `${id}.yaml`);
    if (!topicIds.has(id)) {
      issues.push({ file, message: `孤兒專題來源紀錄：找不到「${id}」。` });
    }
    try {
      const result = parseTopicSourceRecord(readYaml(file));
      if (result.success) {
        const approvedUrls = result.data.sources.map((source) => source.url);
        records.set(id, {
          approvedUrls,
          sectionHeadings: result.data.sections.map(({ heading }) => heading),
        });
        urls.push(...approvedUrls);
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            topic: id,
            file,
            field: issue.path.join("."),
            message: issue.message,
          })),
        );
      }
    } catch (error) {
      issues.push({ topic: id, file, message: (error as Error).message });
    }
  }
  for (const name of listUnrecognizedSourceFiles(dir)) {
    issues.push({
      file: join(dir, name),
      message: "無法辨識的專題來源紀錄檔（只接受 <識別值>.yaml）。",
    });
  }
  return { issues, fileIds, records, urls };
}

/** 讀取並驗證 topic.md；回傳 frontmatter 資料與內文，失敗時只有問題。 */
function readTopic(
  topicsDir: string,
  id: string,
): {
  issues: Issue[];
  topic?: Topic;
  body?: string;
  /** frontmatter 與內文原文；schema 驗證失敗時用詞檢查仍可使用。 */
  markdown?: { data: unknown; body: string };
} {
  const file = join(topicsDir, id, "topic.md");
  const issues: Issue[] = [];
  if (!TOPIC_ID_PATTERN.test(id)) {
    issues.push({
      topic: id,
      file,
      message: "專題資料夾名稱必須是小寫英數字以連字號分隔。",
    });
  }
  let markdown: ReturnType<typeof readMarkdown>;
  try {
    markdown = readMarkdown(file);
  } catch (error) {
    return {
      issues: [
        ...issues,
        { topic: id, file, message: (error as Error).message },
      ],
    };
  }
  if (markdown === undefined) {
    return {
      issues: [
        ...issues,
        { topic: id, file, message: "資料夾內沒有 topic.md。" },
      ],
    };
  }
  const result = schema.safeParse(markdown.data);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((issue) => ({
        topic: id,
        file,
        field: issue.path.join(".") || undefined,
        message: issue.message,
      })),
    );
    return { issues, markdown };
  }
  return { issues, topic: result.data, body: markdown.body, markdown };
}

/** 相關連結只能指向已發布的菜譜與食材條目。 */
function checkRelatedLinks(
  id: string,
  file: string,
  topic: Topic,
  published: { recipes: ReadonlySet<string>; ingredients: ReadonlySet<string> },
): Issue[] {
  const check = (
    field: "relatedRecipes" | "relatedIngredients",
    known: ReadonlySet<string>,
    label: string,
  ): Issue[] =>
    topic[field].flatMap((target, index) =>
      known.has(target)
        ? []
        : [
            {
              topic: id,
              file,
              field: `${field}.${index}`,
              message: `${label}「${target}」不存在或尚未發布。`,
            },
          ],
    );
  return [
    ...check("relatedRecipes", published.recipes, "相關菜譜"),
    ...check("relatedIngredients", published.ingredients, "相關食材條目"),
  ];
}

/** 封面圖規格與替代文字；圖片檢查不綁定菜譜，問題標在專題上。 */
async function checkHero(
  topicsDir: string,
  id: string,
  hero: NonNullable<Topic["hero"]>,
): Promise<Issue[]> {
  const ref = { field: "hero", src: hero.src, alt: hero.alt };
  const info = await readImageInfo(join(topicsDir, id, ref.src));
  return [
    ...checkImageFile({ topic: id }, ref, info),
    ...checkHeroAlt({ topic: id }, ref),
  ];
}

/** 已發布專題的來源紀錄：存在、至少一筆核准來源，且段落對照涵蓋內文每個 `##` 小節。 */
function checkSourceRecord(
  id: string,
  sourceFile: string,
  record: SourceRecord | undefined,
  body: string,
): Issue[] {
  if (!record) return [];
  const issues: Issue[] = [];
  if (record.approvedUrls.length === 0) {
    issues.push({
      topic: id,
      file: sourceFile,
      field: "sources",
      message: "公開專題至少需要一筆核准來源。",
    });
  }
  const headings = bodyHeadings(body);
  const listed = new Set(record.sectionHeadings);
  const actual = new Set(headings.map(({ text }) => text));
  for (const heading of record.sectionHeadings) {
    if (!actual.has(heading)) {
      issues.push({
        topic: id,
        file: sourceFile,
        field: "sections",
        message: `段落對照的小節「${heading}」不是專題內文的 ## 或 ### 標題（以純文字照抄標題）。`,
      });
    }
  }
  for (const { level, text } of headings) {
    if (level === 2 && !listed.has(text)) {
      issues.push({
        topic: id,
        file: sourceFile,
        field: "sections",
        message: `專題內文的小節「${text}」沒有列入段落對照。`,
      });
    }
  }
  return issues;
}

/** 選題參考會公開顯示，不能同時是核准來源。 */
function checkReferences(
  id: string,
  file: string,
  topic: Topic,
  approvedUrls: readonly string[],
): Issue[] {
  const approved = new Set(approvedUrls.map(sourceCore));
  return topic.references.flatMap((reference, index) =>
    approved.has(sourceCore(reference.url))
      ? [
          {
            topic: id,
            file,
            field: `references.${index}.url`,
            message: `選題參考網址 ${reference.url} 同時是核准來源；選題參考會公開顯示，不能當核准來源。`,
          },
        ]
      : [],
  );
}

/**
 * 核對每篇專題的 frontmatter、封面圖與內部來源紀錄；
 * 已發布專題的相關連結只能指向已發布的菜譜與食材條目。
 * 回傳的草稿識別值與核准來源網址交給洩漏掃描。
 */
export async function checkTopics(input: TopicCheckOptions): Promise<{
  issues: Issue[];
  draftIds: string[];
  sourceUrls: string[];
}> {
  const ids = listDirectories(input.topicsDir);
  if (!ids) {
    return {
      issues: [
        {
          file: input.topicsDir,
          message: "找不到專題目錄（檢查 TOPICS_DIR）。",
        },
      ],
      draftIds: [],
      sourceUrls: [],
    };
  }
  const sources = readSourceRecords(input.topicSourcesDir, new Set(ids));
  const issues = [...sources.issues];
  const draftIds: string[] = [];
  const topics = ids.map((id) => ({ id, ...readTopic(input.topicsDir, id) }));
  const published = {
    recipes: new Set(input.publicRecipeIds),
    ingredients: new Set(input.publicIngredientIds),
    topics: new Set(
      topics.filter(({ topic }) => topic && !topic.draft).map(({ id }) => id),
    ),
  };
  for (const { id, issues: topicIssues, topic, body, markdown } of topics) {
    const file = join(input.topicsDir, id, "topic.md");
    issues.push(...topicIssues);
    // 用詞：草稿也檢查
    if (markdown) {
      issues.push(
        ...checkTerms({ topic: id }, file, markdown.data, REFERENCE_TEXT),
        ...checkTermsInText({ topic: id }, file, "body", markdown.body),
      );
    }
    if (!topic || body === undefined) continue;
    if (topic.draft) {
      draftIds.push(id);
      continue;
    }
    issues.push(...checkBodyLinks(id, file, body, published));
    issues.push(...checkRelatedLinks(id, file, topic, published));
    if (topic.hero) {
      issues.push(...(await checkHero(input.topicsDir, id, topic.hero)));
    }
    const sourceFile = join(input.topicSourcesDir, `${id}.yaml`);
    const record = sources.records.get(id);
    if (!sources.fileIds.has(id)) {
      issues.push({
        topic: id,
        file: sourceFile,
        message: "公開專題沒有內部來源紀錄。",
      });
      continue;
    }
    issues.push(...checkSourceRecord(id, sourceFile, record, body));
    if (record) {
      issues.push(...checkReferences(id, file, topic, record.approvedUrls));
    }
  }
  return { issues, draftIds, sourceUrls: sources.urls };
}
