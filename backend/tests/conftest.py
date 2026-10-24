import os
import sys
import tempfile
from pathlib import Path

# Isolated storage for tests, set before app.py is imported.
os.environ["STORAGE_DIR"] = tempfile.mkdtemp(prefix="sodium-test-")
os.environ["MODULE_A_MODE"] = "mock"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
