
CREATE TABLE public.custom_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  spec JSONB NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_layouts TO authenticated;
GRANT ALL ON public.custom_layouts TO service_role;
ALTER TABLE public.custom_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own layouts" ON public.custom_layouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX custom_layouts_user_idx ON public.custom_layouts(user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER custom_layouts_touch BEFORE UPDATE ON public.custom_layouts
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
