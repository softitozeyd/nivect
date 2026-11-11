import tempfile
import unittest
from pathlib import Path
from training.train import audit_manifest

class SplitAuditTests(unittest.TestCase):
    def test_rejects_physical_bottle_leakage(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for i in range(3):(root/f'{i}.jpg').write_bytes(bytes([i]))
            p=root/'manifest.csv';p.write_text('image,split,bottle_id,session_id\n0.jpg,train,b1,s1\n1.jpg,val,b1,s2\n2.jpg,test,b3,s3\n')
            with self.assertRaisesRegex(ValueError,'bottle_id'):audit_manifest(p)
    def test_rejects_content_leakage_even_after_renaming(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d)
            for i in range(3):(root/f'{i}.jpg').write_bytes(b'identical')
            p=root/'manifest.csv';p.write_text('image,split,bottle_id,session_id\n0.jpg,train,b1,s1\n1.jpg,val,b2,s2\n2.jpg,test,b3,s3\n')
            with self.assertRaisesRegex(ValueError,'Identical image'):audit_manifest(p)
