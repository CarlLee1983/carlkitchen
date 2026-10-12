import { readFileSync } from "node:fs";
import type { FigureData } from "../content/figure-schema.ts";
import * as kit from "../vendor/anatomy/iso-kit.ts";

const kitCss = readFileSync(
  new URL("../vendor/anatomy/iso.css", import.meta.url),
  "utf8",
);
const width = 680;
const height = 380;
const projection = kit.fitProjection(
  [...kit.boxCorners({ x: -95, y: -70, w: 190, d: 140, r: 15 }, -18, 35)],
  width,
  height,
  { pad: 30, azimuth: 45, elevation: 42 },
);

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );

function wokSvg(alt: string) {
  const parts: string[] = [];
  const solid = kit.solidSvg;
  parts.push(
    `<path class="iso-halo" d="${kit.haloOf({ x: -79, y: -62, w: 158, d: 124, r: 60 }, -16, 5, projection)}"/>`,
  );
  // 鍋柄先於鍋身繪製，讓接縫自然藏在鍋緣下方。
  parts.push(
    solid(
      kit.slabOf(
        { x: 48, y: -6, w: 79, d: 13, r: 5 },
        12,
        5,
        projection,
        5,
        0.8,
      ),
      { tone: "mid" },
    ),
  );
  parts.push(
    solid(
      kit.slabOf(
        { x: 103, y: -7, w: 32, d: 15, r: 5 },
        11,
        7,
        projection,
        5,
        0.8,
      ),
      { tone: "lo" },
    ),
  );
  // 鍋底窄、鍋口寬；每片側面皆以 kit 相機投影，形成可見的半圈斜鍋壁。
  const facing = kit.towardViewer(projection);
  const angle = Math.atan2(facing[1], facing[0]);
  for (let index = 0; index < 32; index++) {
    const a = angle - Math.PI / 2 + (Math.PI * index) / 32;
    const b = angle - Math.PI / 2 + (Math.PI * (index + 1)) / 32;
    const point = (theta: number, radius: number, z: number) =>
      kit.iso(
        [Math.cos(theta) * radius, Math.sin(theta) * radius, z],
        projection,
      );
    const path = kit.pathOf(
      [
        point(a, 72, 19),
        point(b, 72, 19),
        point(b, 43, -13),
        point(a, 43, -13),
      ],
      true,
    );
    parts.push(
      `<path class="wok-shell-panel" data-shade="${Math.floor(index / 8)}" d="${path}"/>`,
    );
  }
  parts.push(
    kit.lineSvg(kit.sideArc(0, 0, 43, -13, projection, 48), { tone: "lo" }),
  );
  parts.push(
    `<path class="wok-oil" d="${kit.ring(0, 0, 64, 19.2, projection, 64)}"/>`,
  );
  parts.push(
    kit.lineSvg(kit.ring(0, 0, 72, 19.4, projection, 64), { tone: "hi" }),
  );
  parts.push(
    kit.lineSvg(kit.ring(0, 0, 65, 19.7, projection, 64), { tone: "lo" }),
  );
  const nuts: Array<[number, number, number]> = [
    [-42, -16, 0.2],
    [-23, -34, -0.3],
    [2, -37, 0.5],
    [27, -29, 0.1],
    [44, -11, 0.4],
    [-46, 11, -0.2],
    [-29, 3, 0.4],
    [-10, -14, 0],
    [11, -13, 0.6],
    [34, 6, -0.4],
    [-31, 29, 0.1],
    [-9, 15, 0.5],
    [12, 11, -0.2],
    [30, 30, 0.3],
    [0, 37, 0],
  ];
  for (const [x, y, tilt] of nuts.sort(
    (a, b) =>
      kit.depthOf([a[0], a[1], 20], projection) -
      kit.depthOf([b[0], b[1], 20], projection),
  )) {
    const [cx, cy] = kit.iso([x, y, 20.1 + tilt], projection);
    parts.push(
      `<g class="wok-peanut" transform="translate(${cx} ${cy}) rotate(-31)"><ellipse rx="11" ry="5.5"/><path d="M-7 0 Q0 -2 7 0"/></g>`,
    );
  }
  const bubbles = [
    [-51, -1],
    [-37, -25],
    [-17, 31],
    [4, -27],
    [23, -2],
    [47, 19],
    [11, 28],
  ] as const;
  parts.push(
    `<g class="wok-bubbles">${bubbles
      .map(([x, y], index) => {
        const [cx, cy] = kit.iso([x, y, 20.4], projection);
        return `<circle cx="${cx}" cy="${cy}" r="${index % 2 ? 3 : 2}"/>`;
      })
      .join("")}</g>`,
  );
  const steam = [
    [-30, -24],
    [6, -16],
    [36, 10],
  ] as const;
  parts.push(
    `<g class="wok-steam">${steam
      .map(([x, y]) => {
        const [cx, cy] = kit.iso([x, y, 23], projection);
        return `<path d="M${cx} ${cy} q-5 -10 1 -17 t1 -16"/>`;
      })
      .join("")}</g>`,
  );
  // 前緣蓋住油面與花生在鍋外的部分。
  parts.push(
    kit.lineSvg(kit.sideArc(0, 0, 72, 17, projection, 48), { tone: "hi" }),
  );
  return kit.figureSvg({ width, height, label: alt, body: parts.join("") });
}

const figureCss = `
.topic-figure.iso[data-theme="light"]{
  --anatomy-paper:var(--paper);--anatomy-face:#fffdf8;--anatomy-top:#ebe8de;
  --anatomy-shade-0:#aaa49a;--anatomy-shade-1:#bcb6ab;--anatomy-shade-2:#cec8bc;--anatomy-shade-3:#dfd9cd;
  --anatomy-hi:var(--ink);--anatomy-mid:#716e68;--anatomy-lo:#a49f95;--anatomy-faint:var(--line);
  --anatomy-halo:#777067;--anatomy-halo-opacity:.16;--anatomy-dot:var(--ink);
  font-family:var(--font-sans);color:var(--ink);background:var(--paper);
}
.topic-figure{box-sizing:border-box;max-width:100%;margin:2.5rem 0;padding:1rem;border:1px solid var(--line)}
.topic-figure *{box-sizing:border-box}
.topic-figure .iso-svg{max-width:100%;overflow:hidden}
.topic-figure .wok-oil{fill:#d8b980;stroke:#a37c45;stroke-width:1.2}
.topic-figure .wok-shell-panel{fill:var(--anatomy-shade-1);stroke:none}
.topic-figure .wok-shell-panel[data-shade="1"]{fill:var(--anatomy-shade-2)}
.topic-figure .wok-shell-panel[data-shade="2"]{fill:var(--anatomy-shade-3)}
.topic-figure .wok-shell-panel[data-shade="3"]{fill:var(--anatomy-shade-2)}
.topic-figure .wok-peanut ellipse{fill:var(--peanut-fill,#a96543);stroke:#74422d;stroke-width:1}
.topic-figure .wok-peanut path{fill:none;stroke:#74422d;stroke-width:.6}
.topic-figure[data-variant="peeled"]{--peanut-fill:#e6c98d}
.topic-figure[data-stage="start"]{--peanut-fill:#d5b077}
.topic-figure[data-stage="bubbles"]{--peanut-fill:#c99761}
.topic-figure[data-stage="rest"],.topic-figure[data-stage="cool"]{--peanut-fill:#854b32}
.topic-figure .wok-bubbles circle{fill:#fff8df;stroke:#b18e57;stroke-width:1}
.topic-figure .wok-steam path{fill:none;stroke:#a29a8e;stroke-width:1.4;stroke-linecap:round}
.topic-figure[data-stage="start"] .wok-bubbles,.topic-figure[data-stage="start"] .wok-steam,
.topic-figure[data-stage="cool"] .wok-bubbles,.topic-figure[data-stage="cool"] .wok-steam{display:none}
.topic-figure .figure-readout{margin:.4rem 0 1rem;color:var(--ink-soft);font-size:.9rem}
.topic-figure ol{margin:.5rem 0 1rem;padding-inline-start:1.5rem}
.topic-figure li{padding:.2rem 0}
.topic-figure li[data-current="true"]{font-weight:600}
.topic-figure figcaption{border-top:1px solid var(--line);padding-top:.8rem;font-family:var(--font-serif);line-height:1.7}
`;

/** 對應圖識別值的靜態繪圖模組；後續互動票只需切換 data-stage / data-variant。 */
export function renderPeanutFrying(data: FigureData) {
  const keyStage = data.stages.find((stage) => stage.id === data.keyStage)!;
  const firstVariant = data.variants[0]!.id;
  const readout =
    typeof keyStage.readout === "string"
      ? keyStage.readout
      : keyStage.readout[firstVariant]!;
  const stages = data.stages
    .map((stage) => {
      const time =
        stage.start === stage.end
          ? `${stage.start} 分鐘`
          : `${stage.start}–${stage.end} 分鐘`;
      const { readout } = stage;
      const detail =
        typeof readout === "string"
          ? readout
          : data.variants
              .map((variant) => `${variant.label}：${readout[variant.id]}`)
              .join("；");
      return `<li data-current="${stage.id === data.keyStage}" data-stage-id="${escapeHtml(stage.id)}"><strong>${escapeHtml(stage.label)}</strong>（${time}）：${escapeHtml(detail)}</li>`;
    })
    .join("");
  return `<style>${kitCss}\n${figureCss}</style><figure class="topic-figure iso" data-theme="light" data-topic-figure="peanut-frying" data-stage="${escapeHtml(data.keyStage)}" data-variant="${escapeHtml(firstVariant)}">
    <div data-pagefind-ignore="all">${wokSvg(data.alt)}</div>
    <p class="figure-readout" data-pagefind-ignore>${escapeHtml(readout)}</p>
    <ol data-pagefind-ignore>${stages}</ol>
    <figcaption>${escapeHtml(data.caption)}</figcaption>
  </figure>`;
}
