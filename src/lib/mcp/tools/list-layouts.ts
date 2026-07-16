import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_layouts",
  title: "List layouts",
  description: "List the signed-in user's saved custom layouts, newest first.",
  inputSchema: {
    folder: z.string().optional().describe("Optional folder name to filter by."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ folder, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("custom_layouts")
      .select("id, name, folder, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (folder) query = query.eq("folder", folder);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { layouts: data ?? [] },
    };
  },
});