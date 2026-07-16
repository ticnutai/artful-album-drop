import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "send_chat_message",
  title: "Send chat message",
  description: "Post a message to the studio chat as the signed-in user.",
  inputSchema: {
    body: z.string().min(1).max(2000).describe("Message text."),
    display_name: z.string().min(1).max(80).optional().describe("Optional display name override."),
    room_id: z.string().optional().describe("Room id (default 'main')."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ body, display_name, room_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const name = display_name ?? ctx.getUserEmail()?.split("@")[0] ?? "user";
    const { data, error } = await supabaseForUser(ctx)
      .from("chat_messages")
      .insert({
        room_id: room_id ?? "main",
        user_id: ctx.getUserId(),
        display_name: name,
        body,
      })
      .select("id, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Sent (${data.id})` }],
      structuredContent: { message: data },
    };
  },
});