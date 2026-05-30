import type { DmEdge, DmNode } from "./types";

/** App 内部剪贴板（仅 drawmaker 内）。文字编辑用系统剪贴板，与此无关。 */
export interface Clip {
  nodes: DmNode[];
  edges: DmEdge[];
}

let clip: Clip | null = null;

export function setClipboard(c: Clip): void {
  clip = c;
}

export function getClipboard(): Clip | null {
  return clip;
}
