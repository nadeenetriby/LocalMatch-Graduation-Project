"""MongoDB connection for the data pipeline."""

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from pymongo import MongoClient

_SERVER_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_SERVER_DIR / ".env")

_mongo_uri = os.environ.get("MONGO_URI")
if not _mongo_uri:
    raise RuntimeError("MONGO_URI is missing. Add it to server/.env")


def _database_name(uri: str) -> str:
    explicit = os.environ.get("MONGO_DB_NAME", "").strip()
    if explicit:
        return explicit

    normalized = uri.replace("mongodb+srv://", "mongodb://").replace("mongodb://", "http://")
    parsed = urlparse(normalized)
    name = (parsed.path or "").lstrip("/").split("?")[0]
    if name:
        return name

    # Mongoose uses "test" when the URI has no database segment.
    return "test"


_client = MongoClient(_mongo_uri)
db = _client[_database_name(_mongo_uri)]
