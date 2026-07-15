-- 1) custom_layouts additions
ALTER TABLE public.custom_layouts
  ADD COLUMN IF NOT EXISTS folder text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2) chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL DEFAULT 'main',
  user_id uuid,
  display_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chat_messages TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can send as themselves"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_messages_room_created_idx
  ON public.chat_messages (room_id, created_at DESC);

-- 3) realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
