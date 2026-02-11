-- Weekly match opt-in: users opt in by Sunday evening to be in Monday's match run.
-- batch_week = Monday date (YYYY-MM-DD) of the week they're opting in for.
CREATE TABLE IF NOT EXISTS public.weekly_match_opt_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_week date NOT NULL,
  opted_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, batch_week)
);

CREATE INDEX IF NOT EXISTS idx_weekly_match_opt_ins_batch_week ON public.weekly_match_opt_ins(batch_week);
CREATE INDEX IF NOT EXISTS idx_weekly_match_opt_ins_user_id ON public.weekly_match_opt_ins(user_id);

ALTER TABLE public.weekly_match_opt_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own weekly opt-ins"
  ON public.weekly_match_opt_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly opt-ins"
  ON public.weekly_match_opt_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly opt-ins"
  ON public.weekly_match_opt_ins FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.weekly_match_opt_ins IS 'Weekly opt-in for match run: user opts in for a batch_week (Monday date) to be included in that week''s Monday morning match run. Opt in by Sunday 11:59pm.';
