"""Compatibility entrypoint: task CRUD is covered by the navigation regression.

The updated suite keeps validation, create/edit/status/delete, failure/retry,
focus, and responsive checks, plus full-collection search/filter/navigation.
Its in-memory fixture is not presented as a Firestore integration test.
"""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name('browser-navigation.py')), run_name='__main__')
