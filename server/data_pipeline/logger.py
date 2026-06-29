"""Structured logging for the data pipeline."""

import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    stream=sys.stderr,
)

logger = logging.getLogger("data_pipeline")
