-- Seed primary admin (idempotent). Keeps admin_users in sync with isAdmin bootstrap.
INSERT INTO public.admin_users (email)
VALUES ('aarshvir@gmail.com')
ON CONFLICT (email) DO NOTHING;
