import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_chat_messages",
  title: "List chat messages",
  description: "List recent chat messages from a room, newest last.",
  inputSchema: {
    room_id: z.string().optional().describe("Room id (default 'main')."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ room_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("chat_messages")
      .select("id, room_id, display_name, body, created_at, user_id")
      .eq("room_id", room_id ?? "main")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).reverse();
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { messages: rows },
    };
  },
});