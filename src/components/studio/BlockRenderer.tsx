import {
  ScreenCanvas, Toolbar, EmojiRail, ReactionsFloat, ParticipantsPanel,
  LiveClock, RoomCodeBadge, QualityHUD, TitleBlock, ActionButton,
  useReactions, type Theme,
} from "./shared";
import { useState } from "react";

export type BlockType =
  | "canvas" | "participants" | "toolbar" | "emoji" | "clock"
  | "roomCode" | "quality" | "title" | "action";

export type Block = {
  id: string;
  type: BlockType;
  x: number; y: number; w: number; h: number; z?: number;
  props?: {
    theme?: Theme;
    variant?: "list" | "compact" | "avatars";
    orientation?: "horizontal" | "vertical";
    text?: string;
  };
};

export type LayoutSpec = {
  grid: { cols: number; rows: number };
  background: string;
  blocks: Block[];
};

export function BlockContent({ block }: { block: Block }) {
  const theme = block.props?.theme ?? "light";
  const [tool, setTool] = useState("pen");
  const { reactions, send } = useReactions();

  switch (block.type) {
    case "canvas": return <ScreenCanvas />;
    case "participants": return <ParticipantsPanel theme={theme} variant={block.props?.variant ?? "list"} />;
    case "toolbar":
      return <div className="w-full h-full grid place-items-center p-2"><Toolbar tool={tool} setTool={setTool} theme={theme} orientation={block.props?.orientation ?? "horizontal"} /></div>;
    case "emoji":
      return (
        <div className="relative w-full h-full grid place-items-center p-2">
          <EmojiRail onSend={send} theme={theme} orientation={block.props?.orientation ?? "vertical"} />
          <div className="absolute inset-0 pointer-events-none"><ReactionsFloat reactions={reactions} /></div>
        </div>
      );
    case "clock": return <div className="w-full h-full grid place-items-center"><LiveClock theme={theme} /></div>;
    case "roomCode": return <div className="w-full h-full grid place-items-center"><RoomCodeBadge theme={theme} /></div>;
    case "quality": return <div className="w-full h-full grid place-items-center"><QualityHUD theme={theme} /></div>;
    case "title": return <div className="w-full h-full grid place-items-center px-2"><TitleBlock text={block.props?.text ?? "שיתוף מסך"} theme={theme} /></div>;
    case "action": return <div className="w-full h-full grid place-items-center"><ActionButton label={block.props?.text ?? "הזמן"} theme={theme} /></div>;
  }
}

export const BLOCK_LIBRARY: { type: BlockType; label: string; icon: string; defaultSize: [number, number] }[] = [
  { type: "canvas", label: "קנבס מסך", icon: "🖥️", defaultSize: [8, 6] },
  { type: "participants", label: "משתתפים", icon: "👥", defaultSize: [3, 6] },
  { type: "toolbar", label: "סרגל כלים", icon: "🎨", defaultSize: [4, 1] },
  { type: "emoji", label: "אמוג'י", icon: "😊", defaultSize: [1, 4] },
  { type: "clock", label: "שעון LIVE", icon: "⏱️", defaultSize: [2, 1] },
  { type: "roomCode", label: "קוד חדר", icon: "🔑", defaultSize: [2, 1] },
  { type: "quality", label: "איכות", icon: "📡", defaultSize: [2, 1] },
  { type: "title", label: "כותרת", icon: "📝", defaultSize: [4, 1] },
  { type: "action", label: "כפתור", icon: "🔘", defaultSize: [2, 1] },
];

export function defaultSpec(): LayoutSpec {
  return {
    grid: { cols: 12, rows: 8 },
    background: "bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50",
    blocks: [
      { id: "b1", type: "canvas", x: 3, y: 0, w: 9, h: 6, props: { theme: "light" } },
      { id: "b2", type: "participants", x: 0, y: 0, w: 3, h: 6, props: { theme: "light", variant: "list" } },
      { id: "b3", type: "toolbar", x: 5, y: 6, w: 5, h: 1, props: { theme: "light" } },
      { id: "b4", type: "emoji", x: 10, y: 6, w: 2, h: 2, props: { theme: "light", orientation: "horizontal" } },
      { id: "b5", type: "clock", x: 0, y: 6, w: 2, h: 1, props: { theme: "light" } },
      { id: "b6", type: "roomCode", x: 2, y: 6, w: 2, h: 1, props: { theme: "light" } },
      { id: "b7", type: "quality", x: 0, y: 7, w: 4, h: 1, props: { theme: "light" } },
      { id: "b8", type: "action", x: 4, y: 7, w: 2, h: 1, props: { theme: "light" } },
    ],
  };
}
