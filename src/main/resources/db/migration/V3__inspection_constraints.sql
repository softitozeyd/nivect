ALTER TABLE bottle_inspections ADD CONSTRAINT ck_inspection_result CHECK (overall_result IN ('PASS','FAIL','REVIEW'));
ALTER TABLE bottle_inspections ADD CONSTRAINT ck_inspection_source CHECK (source IN ('CAMERA','MANUAL','LEGACY'));
