export type NotesRpcPayload =
  | { op: "list"; search?: string }
  | { op: "get"; id: string }
  | {
      op: "create";
      title: string;
      code: string;
      language?: string;
      tags?: string[];
    }
  | {
      op: "update";
      id: string;
      title?: string;
      code?: string;
      language?: string;
      tags?: string[];
      isFavorite?: boolean;
    }
  | { op: "delete"; id: string };

export type NotesRpcResult<T = unknown> = { success: true; data: T } | { success: false; error: string };
