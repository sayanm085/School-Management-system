import raw from "@/data/seed.json";
import type { Database } from "@/lib/types";

export const seed = raw as unknown as Database;
