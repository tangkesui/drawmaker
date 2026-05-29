import { useEffect } from "react";
import { fileName } from "../core/document-actions";
import { useEditorStore } from "../core/store";
import { setWindowTitle } from "../services/windowService";

/** 把「文件名 + 脏标记」同步到原生窗口标题。不渲染内容。 */
export function TitleSync() {
  const currentPath = useEditorStore((s) => s.file.currentPath);
  const dirty = useEditorStore((s) => s.history.cursor !== s.file.savedCursor);

  useEffect(() => {
    const title = `${dirty ? "• " : ""}${fileName(currentPath)} — drawmaker`;
    setWindowTitle(title).catch(() => {});
  }, [currentPath, dirty]);

  return null;
}
