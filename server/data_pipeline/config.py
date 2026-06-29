"""Pipeline configuration from environment variables."""

import os

MAX_CLEANER_WORKERS = int(os.environ.get("SYNC_CLEANER_WORKERS", "10"))
REQUEST_TIMEOUT = int(os.environ.get("SYNC_REQUEST_TIMEOUT", "20"))
PAGE_THROTTLE_SEC = float(os.environ.get("SYNC_PAGE_THROTTLE", "0.5"))
