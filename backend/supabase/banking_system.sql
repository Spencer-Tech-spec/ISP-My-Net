-- Add bank details to employees table
alter table employees add column if not exists bank_name text;
alter table employees add column if not exists bank_account_number text;
alter table employees add column if not exists bank_account_name text;
alter table employees add column if not exists bank_code text; -- SWIFT/IFSC/Branch code

-- Table for company bank settings (Admin only)
create table if not exists company_settings (
    id int primary key default 1,
    company_name text default 'My Net ISP',
    company_bank_name text,
    company_account_number text,
    disbursement_limit_per_day decimal(12, 2) default 500000.00,
    check (id = 1) -- Ensure only one settings row
);

-- Update withdrawal_requests with disbursement details
alter table withdrawal_requests add column if not exists transaction_reference text;
alter table withdrawal_requests add column if not exists disbursement_method text default 'bank_transfer';
