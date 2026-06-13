import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * 系统剪贴板文本读写（前端唯一碰 Tauri clipboard 插件的地方，守架构铁律）。
 * 文字编辑（input/textarea）的复制粘贴走浏览器原生，与此无关。
 */

/** 读系统剪贴板文本；为空 / 非文本 / 读取异常时返回空串（不抛，调用方按 "无内容" 处理）。 */
export async function readClipboardText(): Promise<string> {
  try {
    return (await readText()) ?? "";
  } catch {
    return "";
  }
}

export async function writeClipboardText(text: string): Promise<void> {
  await writeText(text);
}
