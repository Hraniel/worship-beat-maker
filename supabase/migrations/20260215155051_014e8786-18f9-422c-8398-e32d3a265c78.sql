
-- Add sort_order column to setlists for drag-and-drop reordering
ALTER TABLE public.setlists ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM public.setlists
)
UPDATE public.setlists SET sort_order = ordered.rn
FROM ordered WHERE public.setlists.id = ordered.id;
