ALTER TABLE bottle_inspections ADD COLUMN event_id UUID;
ALTER TABLE bottle_inspections ADD COLUMN camera_id VARCHAR(80) NOT NULL DEFAULT 'legacy';
ALTER TABLE bottle_inspections ADD COLUMN bottle_found BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bottle_inspections ADD COLUMN confidence DOUBLE PRECISION;
ALTER TABLE bottle_inspections ADD COLUMN model_version VARCHAR(80) NOT NULL DEFAULT 'legacy';
ALTER TABLE bottle_inspections ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'LEGACY';
ALTER TABLE bottle_inspections ADD COLUMN defects VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE bottle_inspections ADD COLUMN payload_hash VARCHAR(64);
UPDATE bottle_inspections SET event_id = md5('legacy-inspection-' || id)::uuid,
    defects = CASE WHEN NOT cap_ok THEN 'missing_cap' ELSE '' END
        || CASE WHEN NOT liquid_level_ok THEN ',underfill' ELSE '' END
        || CASE WHEN NOT label_ok THEN ',legacy_label' ELSE '' END;
ALTER TABLE bottle_inspections ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE bottle_inspections ADD CONSTRAINT uk_inspection_event UNIQUE (event_id);
ALTER TABLE bottle_inspections ADD CONSTRAINT ck_inspection_confidence CHECK (confidence BETWEEN 0 AND 1);
CREATE INDEX idx_inspection_time ON bottle_inspections (inspected_at DESC, id DESC);
CREATE INDEX idx_inspection_line_time ON bottle_inspections (line_code, inspected_at DESC);
