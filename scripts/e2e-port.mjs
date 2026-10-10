// 為 e2e 挑一個三個連續 port（base、base+1、base+2）都空著的起點，
// 避免別的 session 占住預設的 4321 時第一輪就失敗。
import net from "node:net";

const DEFAULT_BASE = 4321;
const STEP = 10;
const MAX_ATTEMPTS = 50;
const PORT_COUNT = 3;

/**
 * 試著在 localhost 監聽再關閉，能監聽就代表可綁定。
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "localhost", () => server.close(() => resolve(true)));
  });
}

/**
 * canBind 以參數傳入，測試時可用假的檢查函式。
 * @param {(port: number) => Promise<boolean>} [canBind]
 * @param {number} [start]
 * @returns {Promise<number>}
 */
export async function findPortBase(canBind = isPortFree, start = DEFAULT_BASE) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const base = start + i * STEP;
    let allFree = true;
    for (let offset = 0; offset < PORT_COUNT; offset++) {
      if (!(await canBind(base + offset))) {
        allFree = false;
        break;
      }
    }
    if (allFree) return base;
  }
  const last = start + (MAX_ATTEMPTS - 1) * STEP + PORT_COUNT - 1;
  throw new Error(
    `找不到可用的 e2e port（已試 ${start}–${last}，每組 ${PORT_COUNT} 個）`,
  );
}
