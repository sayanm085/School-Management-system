-- Audit history is append-only. The application role owns these tables, so the
-- guard is a row trigger; deployment additionally revokes UPDATE/DELETE/TRUNCATE
-- from a separate reporting role and runs migrations as a restricted owner.
CREATE OR REPLACE FUNCTION "audit_events_reject_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER "audit_events_append_only"
BEFORE UPDATE OR DELETE ON "audit_events"
FOR EACH ROW EXECUTE FUNCTION "audit_events_reject_mutation"();
