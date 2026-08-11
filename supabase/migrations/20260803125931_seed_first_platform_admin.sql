-- Historical production-only seed.
--
-- The original remote migration inserted the first platform administrator by
-- a project-specific auth.users UUID. Keeping that UUID in a reusable schema
-- migration would make fresh environments fail their foreign-key check, so
-- this local history placeholder is intentionally a no-op. Bootstrap platform
-- administrators separately after their Auth user exists.

select 1;
