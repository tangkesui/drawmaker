import { message } from "@tauri-apps/plugin-dialog";

/** 用原生对话框报错。供 UI 的 .catch() 使用。 */
export async function showError(err: unknown): Promise<void> {
  const text = err instanceof Error ? err.message : String(err);
  await message(text, { title: "drawmaker", kind: "error" });
}
