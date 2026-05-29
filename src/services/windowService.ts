import { getCurrentWindow } from "@tauri-apps/api/window";

export async function setWindowTitle(title: string): Promise<void> {
  await getCurrentWindow().setTitle(title);
}
