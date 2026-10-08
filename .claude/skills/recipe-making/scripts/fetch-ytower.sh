#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "用法：fetch-ytower.sh <楊桃食譜網址> <scratch HTML 輸出路徑>" >&2
  exit 2
fi

url="$1"
output="$2"
host="$(node -e 'try { process.stdout.write(new URL(process.argv[1]).hostname) } catch {}' "$url")"
if [[ "$host" != "ytower.com.tw" && "$host" != *.ytower.com.tw ]]; then
  echo "只接受 ytower.com.tw 網址。" >&2
  exit 2
fi

mkdir -p "$(dirname "$output")"
raw="$(mktemp)"
decoded="$(mktemp "${output}.XXXXXX")"
trap 'rm -f "$raw" "$decoded"' EXIT

if ! curl --fail --show-error --silent --location \
  --connect-timeout 10 --max-time 30 \
  --user-agent 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36' \
  --output "$raw" "$url"; then
  echo "楊桃頁面無法以一般 HTTP 請求讀取；未保存錯誤頁，也不會嘗試繞過存取限制。請改用可公開讀取的核准來源或標記待核。" >&2
  exit 1
fi

if ! iconv -f BIG5 -t UTF-8 "$raw" > "$decoded"; then
  echo "楊桃頁面無法按 Big5 解碼；請保留來源網址並標記待核。" >&2
  exit 1
fi

mv "$decoded" "$output"
echo "已解碼並保存至 $output"
