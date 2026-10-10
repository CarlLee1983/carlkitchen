#!/bin/zsh
# 以 Codex 的生圖工具產生一張插畫（PNG），並輸出 768 px 預覽圖。
# 用法：gen.sh <輸出目錄> <檔名不含副檔名> "<英文構圖描述>" [參考圖1] [參考圖2]
# 固定風格段預設讀自 ../style.txt，環境變數 STYLE_FILE 可改用其他風格檔（專題封面用）；單張 300 秒逾時，stdin 接 /dev/null 避免 codex 卡住。
# 開跑前同時刪掉 <檔名>.png 與 <檔名>.preview.jpg，避免 codex 把殘留的預覽圖存成新的成品。
# 任一參考圖就是本次輸出的 <輸出目錄>/<檔名>.png 時直接報錯（開跑前會刪掉它，等於沒參考），請先複製一份別名再當參考。
# 並行上限：全機最多 GEN_MAX_PARALLEL（預設 2）個 gen.sh 同時生圖，額滿每 10 秒重試並印「等待生圖名額…」。
# 名額是 ${TMPDIR:-/tmp}/carlkitchen-gen-slots/slot-N 鎖目錄（內記 PID），結束、失敗、被中斷時由 trap 釋放；
# 行程已不存在的殘留名額（kill -0 失敗）會自動清掉。排隊等待超過 Bash 工具 timeout 時工具會轉背景，屬預期。
set -u
out=$1; name=$2; scene=$3; ref=${4:-}; ref2=${5:-}
here=${0:A:h}
style=$(<${STYLE_FILE:-$here/../style.txt})
mkdir -p "$out" || exit 1
out=${out:A}

# 參考圖不得等於本次輸出的 PNG；相對路徑的舊行為是相對 $out（cd 之後才用），兩種解析都比對
for r in "$ref" "$ref2"; do
  [[ -z $r ]] && continue
  if [[ ${r:A} == "$out/$name.png" || "$out/$r" == "$out/$name.png" ]]; then
    echo "錯誤：參考圖 $r 就是本次輸出的 $out/$name.png，開跑前會被刪掉。請先複製一份別名（例如 cp 成 ${name}-ref.png）再當參考。" >&2
    exit 1
  fi
done

# 取得生圖名額：每個 slot 是一個目錄，mkdir 為原子操作
slots=${TMPDIR:-/tmp}/carlkitchen-gen-slots
maxp=${GEN_MAX_PARALLEL:-2}
[[ $maxp == <1-> ]] || { echo "錯誤：GEN_MAX_PARALLEL 須為正整數（現為 $maxp）" >&2; exit 1; }
mkdir -p "$slots" || exit 1
myslot=""
release_slot() { [[ -n $myslot ]] && rm -rf "$myslot"; myslot=""; }
trap release_slot EXIT
trap 'exit 130' INT TERM HUP
acquire_slot() {
  local i d p
  for ((i = 1; i <= maxp; i++)); do
    d=$slots/slot-$i
    if mkdir "$d" 2>/dev/null; then
      print -r -- $$ >"$d/pid"; myslot=$d; return 0
    fi
    p=$(<"$d/pid" 2>/dev/null)
    # pid 檔尚未寫入視為剛建立；有 pid 但行程已不在才是殘留
    if [[ -n $p ]] && ! kill -0 "$p" 2>/dev/null; then
      rm -rf "$d"
      if mkdir "$d" 2>/dev/null; then
        print -r -- $$ >"$d/pid"; myslot=$d; return 0
      fi
    fi
  done
  return 1
}
until acquire_slot; do
  echo "等待生圖名額…"
  sleep ${GEN_SLOT_POLL:-10}
done

refargs=(); refnote=""
if [[ -n $ref ]]; then
  refargs=(-i "$ref"); [[ -n $ref2 ]] && refargs+=("$ref2")
  refnote="The attached image is the style reference: match the style, line weight, colors, background and the same cookware of the reference image. "
fi
cd "$out" && rm -f "./$name.png" "./$name.preview.jpg" && perl -e 'alarm shift; exec @ARGV' 300 \
  codex exec --skip-git-repo-check -C "$out" -s workspace-write \
  "Use your image generation tool to create exactly one image and save it as ./$name.png in the current directory, then reply with only the absolute path. ${refnote}Prompt: $style

COMPOSITION: $scene" "${refargs[@]}" </dev/null 2>&1 | tail -2
ls -la "$out/$name.png" && node "$here/img.mjs" preview "$out/$name.png"
