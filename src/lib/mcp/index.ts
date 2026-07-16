import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listLayoutsTool from "./tools/list-layouts";
import getLayoutTool from "./tools/get-layout";
import createLayoutTool from "./tools/create-layout";
import deleteLayoutTool from "./tools/delete-layout";
import listChatMessagesTool from "./tools/list-chat-messages";
import sendChatMessageTool from "./tools/send-chat-message";

// The OAuth issuer must be the direct Supabase host (not the .lovable.cloud proxy),
// so we build it from the project ref that Vite inlines at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "screen-share-studio-mcp",
  title: "Screen Share Studio",
  version: "0.1.0",
  instructions:
    "Tools for managing custom layouts and the live studio chat. Use `list_layouts` and `get_layout` to inspect the signed-in user's saved layouts, `create_layout` to add one, `delete_layout` to remove one, and the chat tools to read or post messages in the shared room.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listLayoutsTool,
    getLayoutTool,
    createLayoutTool,
    deleteLayoutTool,
    listChatMessagesTool,
    sendChatMessageTool,
  ],
});