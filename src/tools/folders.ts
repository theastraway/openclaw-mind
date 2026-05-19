/**
 * mind_folders — Organize MIND documents into folders.
 *
 * Folders are a presentation layer over the document tray — the knowledge
 * graph still indexes and retrieves across every document regardless of
 * folder. Typical flow: mind_add a document, then mind_folders move_documents
 * to file it.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const FoldersParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("list"),
      Type.Literal("create"),
      Type.Literal("rename"),
      Type.Literal("move"),
      Type.Literal("delete"),
      Type.Literal("move_documents"),
    ],
    {
      description:
        "list (all folders + counts), create (new folder), rename (change a folder's name), move (re-nest a folder), delete (remove a folder — its documents and subfolders move up a level, nothing is deleted), move_documents (file documents into a folder).",
    },
  ),
  name: Type.Optional(
    Type.String({ description: "Folder name — required for create and rename." }),
  ),
  folder_id: Type.Optional(
    Type.String({
      description:
        "Folder id — the folder to rename/move/delete, or the destination for move_documents (omit or pass 'root' to file at the top level).",
    }),
  ),
  parent_id: Type.Optional(
    Type.String({
      description: "Parent folder id for create and move. Omit or pass 'root' for the top level.",
    }),
  ),
  doc_ids: Type.Optional(
    Type.Array(Type.String(), {
      description: "Document ids to file — required for move_documents.",
    }),
  ),
});

type FoldersParams = Static<typeof FoldersParameters>;

export function createMindFoldersTool(deps: ToolDeps) {
  return {
    name: "mind_folders",
    label: "MIND Folders",
    description:
      "Organize MIND documents into folders. Folders are a presentation layer — the knowledge graph still indexes and retrieves across every document regardless of folder. Use mind_add to create a document, then mind_folders move_documents to file it. Actions: list, create, rename, move, delete, move_documents.",
    parameters: FoldersParameters,
    async execute(_toolCallId: string, params: FoldersParams) {
      try {
        switch (params.action) {
          case "list": {
            const res = await deps.client.listFolders();
            if (!res.folders.length) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `No folders yet. ${res.unfiled_count} document(s), all at the top level.`,
                  },
                ],
                details: { folders: [], unfiled_count: res.unfiled_count },
              };
            }
            const byId = new Map(res.folders.map((f) => [f.id, f]));
            const lines = res.folders.map((f) => {
              const parent = f.parent_id ? (byId.get(f.parent_id)?.name ?? "?") : "(top level)";
              return `• ${f.name} — ${f.document_count ?? 0} doc(s) · id: ${f.id} · parent: ${parent}`;
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: [
                    `${res.folders.length} folder(s) · ${res.unfiled_count} unfiled · ${res.total_count} total documents`,
                    "",
                    ...lines,
                  ].join("\n"),
                },
              ],
              details: { folders: res.folders },
            };
          }
          case "create": {
            if (!params.name) throw new Error("'name' is required to create a folder");
            const res = await deps.client.createFolder(params.name, params.parent_id ?? null);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Created folder "${res.folder.name}" (id: ${res.folder.id})`,
                },
              ],
              details: { id: res.folder.id, name: res.folder.name },
            };
          }
          case "rename": {
            if (!params.folder_id) throw new Error("'folder_id' is required to rename a folder");
            if (!params.name) throw new Error("'name' is required to rename a folder");
            const res = await deps.client.updateFolder(params.folder_id, { name: params.name });
            return {
              content: [
                { type: "text" as const, text: `Renamed folder to "${res.folder.name}"` },
              ],
              details: { id: res.folder.id, name: res.folder.name },
            };
          }
          case "move": {
            if (!params.folder_id) throw new Error("'folder_id' is required to move a folder");
            // Always send parent_id explicitly (id or null) so the move applies.
            const res = await deps.client.updateFolder(params.folder_id, {
              parent_id: params.parent_id ?? null,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Moved folder "${res.folder.name}" ${
                    res.folder.parent_id ? "into another folder" : "to the top level"
                  }`,
                },
              ],
              details: { id: res.folder.id, parent_id: res.folder.parent_id },
            };
          }
          case "delete": {
            if (!params.folder_id) throw new Error("'folder_id' is required to delete a folder");
            const res = await deps.client.deleteFolder(params.folder_id);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Deleted folder. ${res.documents_reparented} document(s) moved up a level — no documents were deleted.`,
                },
              ],
              details: res,
            };
          }
          case "move_documents": {
            if (!params.doc_ids || !params.doc_ids.length)
              throw new Error("'doc_ids' is required for move_documents");
            const dest =
              !params.folder_id || params.folder_id === "root" ? null : params.folder_id;
            const res = await deps.client.moveDocuments(params.doc_ids, dest);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Moved ${res.moved} document(s) ${
                    dest ? "into the folder" : "to the top level"
                  }`,
                },
              ],
              details: res,
            };
          }
          default:
            throw new Error(`Unknown action: ${String(params.action)}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_folders failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
