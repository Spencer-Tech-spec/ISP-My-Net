-- Create a table for global system settings
create table if not exists settings (
  id int primary key default 1,
  company_name text default 'My Net ISP',
  support_email text default 'support@mynet.com',
  support_phone text default '+254 712 345 678',
  currency text default 'KES (Kenyan Shilling)',
  
  -- M-Pesa API Settings
  mpesa_consumer_key text,
  mpesa_consumer_secret text,
  mpesa_shortcode text,
  mpesa_passkey text,
  mpesa_callback_url text,
  mpesa_initiator_name text,
  mpesa_initiator_password text,
  
  -- MikroTik / SmartOLT settings can also go here in the future
  
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraint to ensure only one settings row exists
  constraint single_row check (id = 1)
);

-- Enable RLS
alter table settings enable row level security;

-- Policies
create policy "Service role can do everything on settings"
  on settings
  using ( auth.role() = 'service_role' )
  with check ( auth.role() = 'service_role' );

-- Allow authenticated users (admins) to read settings
create policy "Admins can view settings"
  on settings
  for select
  using ( auth.role() = 'authenticated' );

-- Allow admins to update settings
create policy "Admins can update settings"
  on settings
  for update
  using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );

-- Insert default row if not exists
insert into settings (id) values (1) on conflict do nothing;
