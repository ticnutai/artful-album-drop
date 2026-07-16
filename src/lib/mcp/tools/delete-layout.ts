import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "delete_layout",
  title: "Delete layout",
  description: "Delete a custom layout owned by the signed-in user.",
  inputSchema: { id: z.string().uuid().describe("Layout id to delete.") },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { error } = await supabaseForUser(ctx)
      .from("custom_layouts")
      .delete()
      .eq("id", id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Deleted layout ${id}` }] };
  },
});