create table debtors (
  id text primary key,
  name text,
  balance numeric,
  oldest_inv_days integer,
  owner text,
  action text
);