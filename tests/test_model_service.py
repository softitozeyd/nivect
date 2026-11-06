import unittest
import os
from unittest.mock import patch

class ModelServiceTests(unittest.TestCase):
    def test_missing_model_is_explicit_and_never_simulates_detections(self):
        try:
            from fastapi.testclient import TestClient
            from camera import server
        except ImportError:
            self.skipTest('Model service dependencies not installed in this Python environment')
        with patch.dict(os.environ,{'QC_MODEL_PATH':''}):
            with TestClient(server.app) as client:
                status=client.get('/health')
                self.assertEqual(status.status_code,200)
                self.assertFalse(status.json()['modelReady'])
                response=client.post('/infer',content=b'not-a-frame',headers={'content-type':'image/jpeg'})
                self.assertEqual(response.status_code,503)
                self.assertEqual(client.post('/infer',content=b'wrong-type').status_code,415)
