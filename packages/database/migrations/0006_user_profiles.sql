-- Store each wallet user's chosen display name and profile icon.
-- The first-login flow detects legacy wallet-address display names and asks
-- the user to choose a human-readable name.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_icon text NOT NULL DEFAULT 'spark';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_avatar_icon_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_avatar_icon_check
  CHECK (avatar_icon IN ('spark','orbit','diamond','sun','flower','leaf','moon','wave'));
