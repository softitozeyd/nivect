import unittest
import tempfile
from pathlib import Path
from camera.engine import BottleGate,Outbox,observation

class CameraTests(unittest.TestCase):
    def test_same_bottle_is_counted_once_and_defects_are_kept(self):
        gate=BottleGate(3,2)
        bottle=observation([('bottle',.9,[0,0,100,300]),('underfill',.8,[10,100,90,220])],'test')
        events=[e for _ in range(20) if (e:=gate.observe(bottle))]
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]['defects'],['underfill'])
        for _ in range(2):gate.observe(observation([],'test'))
        events2=[e for _ in range(3) if (e:=gate.observe(bottle))]
        self.assertEqual(len(events2),1)
        self.assertNotEqual(events[0]['eventId'],events2[0]['eventId'])

    def test_multiple_bottles_and_unrelated_defects_cannot_be_passed_as_single(self):
        result=observation([('bottle',.9,[0,0,100,300]),('bottle',.9,[150,0,250,300])],'test')
        self.assertIsNone(BottleGate(1,1).observe(result))
        result=observation([('bottle',.9,[0,0,100,300]),('missing_cap',.99,[200,0,250,50])],'test')
        self.assertEqual(result['defects'],[])
        self.assertFalse(observation([],'test')['bottleFound'])

    def test_outbox_survives_restart_and_only_ack_removes_event(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'outbox.db'
            one=Outbox(path);event={'eventId':'stable-id','defects':['underfill']}
            one.add(event);one.add(event);one.close()
            two=Outbox(path)
            self.assertEqual(two.pending(),[event])
            two.acknowledge(event['eventId']);self.assertEqual(two.pending(),[]);two.close()

if __name__=='__main__':unittest.main()
