import { invoke } from "@tauri-apps/api/core";

export async function getRecent(): Promise<string[]> {
  return invoke<string[]>("get_recent");
}

/** 把 path 提到最近列表头部，返回更新后的列表（已去重、截断）。 */
export async function pushRecent(path: string): Promise<string[]> {
  return invoke<string[]>("push_recent", { path });
}
