import { z } from "astro/zod";

/** 公開或內部來源網址：只接受 http(s)。 */
export const httpUrl = z.url({ protocol: /^https?$/ });
