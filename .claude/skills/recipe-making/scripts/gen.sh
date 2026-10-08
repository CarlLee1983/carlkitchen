#!/bin/zsh
# 以 Codex 的生圖工具產生一張插畫（PNG），並輸出 768 px 預覽圖。
# 用法：gen.sh <輸出目錄> <檔名不含副檔名> "<英文構圖描述>" [參考圖1] [參考圖2]
# 固定風格段預設讀自 ../style.txt，環境變數 STYLE_FILE 可改用其他風格檔（專題封面用）；單張 300 秒逾時，stdin 接 /dev/null 避免 codex 卡住。
set -u
out=$1; name=$2; scene=$3; ref=${4:-}; ref2=${5:-}
here=${0:A:h}
style=$(<${STYLE_FILE:-$here/../style.txt})
refargs=(); refnote=""
if [[ -n $ref ]]; then
  refargs=(-i "$ref"); [[ -n $ref2 ]] && refargs+=("$ref2")
  refnote="The attached image is the style reference: match the style, line weight, colors, background and the same cookware of the reference image. "
fi
mkdir -p "$out" && cd "$out" && rm -f "./$name.png" && perl -e 'alarm shift; exec @ARGV' 300 \
  codex exec --skip-git-repo-check -C "$out" -s workspace-write \
  "Use your image generation tool to create exactly one image and save it as ./$name.png in the current directory, then reply with only the absolute path. ${refnote}Prompt: $style

COMPOSITION: $scene" "${refargs[@]}" </dev/null 2>&1 | tail -2
ls -la "$out/$name.png" && node "$here/img.mjs" preview "$out/$name.png"
