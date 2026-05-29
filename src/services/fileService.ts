import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { deserializeDocument, serializeDocument } from "../core/serialize";
import type { DmDocument } from "../core/types";

const DM_FILTERS = [{ name: "drawmaker", extensions: ["dm"] }];

/** 原生 open 面板，返回选中路径或 null（取消）。 */
export async function openDialog(): Promise<string | null> {
  const result = await open({ multiple: false, directory: false, filters: DM_FILTERS });
  return typeof result === "string" ? result : null;
}

/** 原生 save 面板，返回目标路径或 null（取消）。 */
export async function saveDialog(suggestedName: string): Promise<string | null> {
  const result = await save({ defaultPath: suggestedName, filters: DM_FILTERS });
  return result ?? null;
}

export async function loadDocument(path: string): Promise<DmDocument> {
  const text = await invoke<string>("read_file", { path });
  return deserializeDocument(text);
}

export async function saveDocument(path: string, doc: DmDocument): Promise<void> {
  await invoke("write_file", { path, contents: serializeDocument(doc) });
}
