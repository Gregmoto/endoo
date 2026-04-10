-- ============================================================
-- Endoo — PostgreSQL Row Level Security policies
-- NOTE: Columns use camelCase (Prisma default, no @map directives)
-- ============================================================

CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '')::uuid
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION bypass_rls() RETURNS boolean AS $$
  SELECT current_setting('app.bypass_rls', true) = 'true'
$$ LANGUAGE SQL STABLE;

-- organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organization_members;
CREATE POLICY tenant_isolation ON organization_members
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON invitations;
CREATE POLICY tenant_isolation ON invitations
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- agency_staff_access
ALTER TABLE agency_staff_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON agency_staff_access;
CREATE POLICY tenant_isolation ON agency_staff_access
  USING (bypass_rls() OR "clientId" = current_org_id());

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON contacts;
CREATE POLICY tenant_isolation ON contacts
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON products;
CREATE POLICY tenant_isolation ON products
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- invoice_line_items
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON invoice_line_items;
CREATE POLICY tenant_isolation ON invoice_line_items
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON payments;
CREATE POLICY tenant_isolation ON payments
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- recurring_schedules
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON recurring_schedules;
CREATE POLICY tenant_isolation ON recurring_schedules
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON subscriptions;
CREATE POLICY tenant_isolation ON subscriptions
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- organization_settings
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organization_settings;
CREATE POLICY tenant_isolation ON organization_settings
  USING (bypass_rls() OR "organizationId" = current_org_id());

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (bypass_rls() OR "organizationId" = current_org_id());
