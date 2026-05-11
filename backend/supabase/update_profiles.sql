-- Add missing columns to profiles table if they don't exist
do $$
begin
    if not exists (select from pg_attribute where attrelid = 'profiles'::regclass and attname = 'phone') then
        alter table profiles add column phone text;
    end if;

    if not exists (select from pg_attribute where attrelid = 'profiles'::regclass and attname = 'email') then
        alter table profiles add column email text;
    end if;

    if not exists (select from pg_attribute where attrelid = 'profiles'::regclass and attname = 'plan') then
        alter table profiles add column plan text default 'Standard';
    end if;

    if not exists (select from pg_attribute where attrelid = 'profiles'::regclass and attname = 'status') then
        alter table profiles add column status text default 'Active';
    end if;

    if not exists (select from pg_attribute where attrelid = 'profiles'::regclass and attname = 'address') then
        alter table profiles add column address text;
    end if;
end $$;

-- Update RLS (if needed, but profiles is already open for select in schema.sql)
-- We can add a policy specifically for admins later if needed.
