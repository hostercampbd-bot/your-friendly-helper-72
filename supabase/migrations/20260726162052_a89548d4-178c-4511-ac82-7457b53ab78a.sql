ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS api_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex');