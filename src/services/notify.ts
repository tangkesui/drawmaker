import { ask, message } from "@tauri-apps/plugin-dialog";

/** 用原生对话框报错。供 UI 的 .catch() 使用。 */
export async function showError(err: unknown): Promise<void> {
  const text = err instanceof Error ? err.message : String(err);
  await message(text, { title: "drawmaker", kind: "error" });
}

/** 原生信息提示框。 */
export async function showInfo(text: string): Promise<void> {
  await message(text, { title: "drawmaker", kind: "info" });
}

/** 原生两按钮确认。返回 true=确认（放弃），false=取消。 */
export async function confirmDiscard(text: string): Promise<boolean> {
  return ask(text, { title: "drawmaker", kind: "warning", okLabel: "放弃", cancelLabel: "取消" });
}
