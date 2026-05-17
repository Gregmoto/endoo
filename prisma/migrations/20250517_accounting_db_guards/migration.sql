-- ──────────────────────────────────────────────────────────────────────────────
-- Accounting Ledger — DB-level immutability guards
-- Apply after accounting tables are created.
--
-- Run manually:
--   psql $DATABASE_URL -f prisma/migrations/20250517_accounting_db_guards/migration.sql
-- ──────────────────────────────────────────────────────────────────────────────


-- ─── 1. Entry-level constraints ───────────────────────────────────────────────
-- A JournalEntry row may be debit OR credit, never both, never neither.

ALTER TABLE journal_entries
  ADD CONSTRAINT chk_entry_exclusive_side
    CHECK (NOT (debit > 0 AND credit > 0));

ALTER TABLE journal_entries
  ADD CONSTRAINT chk_entry_non_negative
    CHECK (debit >= 0 AND credit >= 0);

ALTER TABLE journal_entries
  ADD CONSTRAINT chk_entry_has_amount
    CHECK (debit > 0 OR credit > 0);


-- ─── 2. Protect JournalEntry from mutation once journal is posted ─────────────

CREATE OR REPLACE FUNCTION fn_guard_posted_journal_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
    FROM journals
   WHERE id = COALESCE(OLD.journal_id, NEW.journal_id);

  IF v_status = 'posted' OR v_status = 'voided' THEN
    RAISE EXCEPTION 'journal_immutable: cannot modify entries of % journal (id: %)',
      v_status, COALESCE(OLD.journal_id, NEW.journal_id)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_guard_entry_update
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION fn_guard_posted_journal_entry();

CREATE TRIGGER trg_guard_entry_delete
  BEFORE DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION fn_guard_posted_journal_entry();


-- ─── 3. Protect Journal header from mutation once posted ──────────────────────
-- After posting, only these fields may change:
--   status:         posted → voided  (via void flow)
--   voided_by_id:   set by void flow  (not a DB column but tracked in reversals)
-- All other columns are frozen.

CREATE OR REPLACE FUNCTION fn_guard_posted_journal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'posted' OR OLD.status = 'voided' THEN
    -- Detect changes to frozen columns
    IF (NEW.date            IS DISTINCT FROM OLD.date            OR
        NEW.description     IS DISTINCT FROM OLD.description     OR
        NEW.series_id       IS DISTINCT FROM OLD.series_id       OR
        NEW.number          IS DISTINCT FROM OLD.number          OR
        NEW.fiscal_year_id  IS DISTINCT FROM OLD.fiscal_year_id  OR
        NEW.source_type     IS DISTINCT FROM OLD.source_type     OR
        NEW.source_id       IS DISTINCT FROM OLD.source_id       OR
        NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id) THEN
      RAISE EXCEPTION 'journal_immutable: cannot modify % journal (id: %)',
        OLD.status, OLD.id
        USING ERRCODE = 'P0001';
    END IF;

    -- Allow only posted → voided; block any other status transition
    IF OLD.status = 'posted' AND NEW.status NOT IN ('posted', 'voided') THEN
      RAISE EXCEPTION 'journal_invalid_transition: posted journal can only become voided (id: %)',
        OLD.id
        USING ERRCODE = 'P0001';
    END IF;

    -- A voided journal cannot change status at all
    IF OLD.status = 'voided' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'journal_immutable: voided journal status cannot change (id: %)',
        OLD.id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_journal_update
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION fn_guard_posted_journal();


-- ─── 4. Balance validation on posting ────────────────────────────────────────
-- Fires when status transitions draft → posted.
-- Ensures: entry count ≥ 2, SUM(debit) = SUM(credit), SUM(debit) > 0.

CREATE OR REPLACE FUNCTION fn_validate_journal_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_count  BIGINT;
  v_debit  BIGINT;
  v_credit BIGINT;
BEGIN
  -- Only fires on draft → posted transition
  IF NOT (NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft')) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*),
         COALESCE(SUM(debit),  0),
         COALESCE(SUM(credit), 0)
    INTO v_count, v_debit, v_credit
    FROM journal_entries
   WHERE journal_id = NEW.id;

  IF v_count < 2 THEN
    RAISE EXCEPTION 'journal_too_few_entries: journal % has % entries (minimum 2)',
      NEW.id, v_count
      USING ERRCODE = 'P0001';
  END IF;

  IF v_debit = 0 THEN
    RAISE EXCEPTION 'journal_empty: journal % has zero debit total',
      NEW.id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'journal_unbalanced: journal % debit=% credit=% (diff=%)',
      NEW.id, v_debit, v_credit, v_debit - v_credit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_balance_on_post
  BEFORE UPDATE ON journals
  FOR EACH ROW EXECUTE FUNCTION fn_validate_journal_balance();


-- ─── 5. Block new entries in locked fiscal years ──────────────────────────────

CREATE OR REPLACE FUNCTION fn_guard_locked_fiscal_year()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year_status TEXT;
BEGIN
  SELECT fy.status INTO v_year_status
    FROM fiscal_years fy
    JOIN journals j ON j.fiscal_year_id = fy.id
   WHERE j.id = NEW.journal_id;

  IF v_year_status = 'locked' THEN
    RAISE EXCEPTION 'fiscal_year_locked: cannot add entries to a locked fiscal year'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_locked_year_entry_insert
  BEFORE INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION fn_guard_locked_fiscal_year();


-- ─── 6. Block new journals in locked/closed accounting periods ────────────────
-- Belt-and-suspenders: assertPeriodOpen() in app layer is the primary guard.
-- This trigger prevents bypasses via raw SQL or direct DB access.

CREATE OR REPLACE FUNCTION fn_guard_locked_period_journal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_period_status TEXT;
BEGIN
  IF NEW.period_id IS NULL THEN
    RETURN NEW; -- no period assigned (legacy / pre-period feature)
  END IF;

  SELECT status INTO v_period_status
    FROM accounting_periods
   WHERE id = NEW.period_id;

  IF v_period_status = 'locked' THEN
    RAISE EXCEPTION 'period_locked: accounting period % is locked — cannot insert journal',
      NEW.period_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_period_status = 'closed' THEN
    RAISE EXCEPTION 'period_closed: accounting period % is closed — cannot insert journal',
      NEW.period_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_locked_period_journal_insert
  BEFORE INSERT ON journals
  FOR EACH ROW EXECUTE FUNCTION fn_guard_locked_period_journal();


-- ─── 7. AccountingPeriodSnapshot is immutable once created ───────────────────

CREATE OR REPLACE FUNCTION fn_guard_snapshot_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'snapshot_immutable: accounting period snapshots cannot be modified (period_id: %)',
    OLD.period_id
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_guard_snapshot_update
  BEFORE UPDATE ON accounting_period_snapshots
  FOR EACH ROW EXECUTE FUNCTION fn_guard_snapshot_immutable();

CREATE TRIGGER trg_guard_snapshot_delete
  BEFORE DELETE ON accounting_period_snapshots
  FOR EACH ROW EXECUTE FUNCTION fn_guard_snapshot_immutable();
