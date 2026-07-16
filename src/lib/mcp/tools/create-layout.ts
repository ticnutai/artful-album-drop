import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "create_layout",
  title: "Create layout",
  description: "Create a new custom layout owned by the signed-in user.",
  inputSchema: {
    name: z.string().min(1).max(200).describe("Layout display name."),
    spec: z.unknown().describe("Layout spec JSON (blocks, positions, etc.)."),
    folder: z.string().optional().describe("Optional folder name."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, spec, folder }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const userId = ctx.getUserId();
    if (!userId) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("custom_layouts")
      .insert({
        user_id: userId,
        name,
        spec: spec as never,
        folder: folder ?? null,
      })
      .select("id, name, folder, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created layout ${data.id}` }],
      structuredContent: { layout: data },
    };
  },
});