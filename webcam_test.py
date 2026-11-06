"""Compatibility entry point for the authenticated PET camera adapter.

Install camera/requirements-model.txt, set QC_INGEST_PASSWORD locally, then run:
python webcam_test.py --weights best.pt --source 0
"""
from camera.run import main
if __name__=='__main__':
    main()
