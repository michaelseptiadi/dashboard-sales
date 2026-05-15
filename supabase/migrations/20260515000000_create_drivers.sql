create table public.drivers (
  id uuid not null default gen_random_uuid (),
  driver_name text not null,
  phone_number text null,
  address character varying null,
  created_at timestamp with time zone not null default now(),
  constraint drivers_pkey primary key (id)
) TABLESPACE pg_default;
