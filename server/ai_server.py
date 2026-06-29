"""
AI Server for Local Match - CLIP Model Integration
Integrates CLIP embeddings with FAISS for semantic search
Supports both text and image search
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import io
import time
import torch
import numpy as np
import logging
import os
from typing import List
import requests

from ai.ai_engine import all_image_urls, clip_model, device, index,search_text,search_by_image

from ai.ai_engine import search_multimodal
from fastapi import Form

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class SearchRequest(BaseModel):
    query: str

class SearchImageURLRequest(BaseModel):
    url: str

# ============================================================================
# INITIALIZATION
# ============================================================================


# @app.on_event("startup")
# async def startup():
#     load_clip_model()
#     load_embeddings()

#     set_dependencies(
#         clip_model,
#         clip_processor,
#         faiss_index_text,   # 🔥 IMPORTANT (use TEXT index)
#         all_image_urls
#     )

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
def root():
    return {
        "name": "LocalMatch AI Server",
        "version": "1.0.0",
        "model": "CLIP + FAISS"
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": str(device),
        "clip_loaded": clip_model is not None,
        "image_index_ready": index is not None,
        "text_index_ready": index is not None,
        "total_image_urls": len(all_image_urls) if all_image_urls else 0
    }

# 
@app.post("/search-text")
def search_text_api(request: SearchRequest):
    start = time.perf_counter()
    results = search_text(request.query)
    end = time.perf_counter()
    print(f"Text Retrieval Time: {(end-start)*1000:.2f} ms")
    return {
        "results": results,
        "count": len(results)
    }
@app.post("/search-image")
async def search_image_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        start = time.perf_counter()

        results= search_by_image(image)
        end = time.perf_counter()
        print(f"Image Retrieval Time: {(end-start)*1000:.2f} ms")

        return {
            "results": results,
            "count": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/search-image-url")
async def search_image_url_endpoint(request: SearchImageURLRequest):
    try:
        response = requests.get(request.url)
        image = Image.open(io.BytesIO(response.content)).convert("RGB")

        results = search_by_image(image)

        return {
            "results": results,
            "count": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/search-combined")
async def search_combined_endpoint(
    text: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        start = time.perf_counter()

        results = search_multimodal(image, text)

        end = time.perf_counter()
        print(f"Multimodal Retrieval Time: {(end-start)*1000:.2f} ms")

        return {
            "results": results,
            "count": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/try-on")
async def try_on_api(person: UploadFile = File(...), cloth: UploadFile = File(...)):
    """Try-on endpoint (placeholder)"""
    return {"image": "https://via.placeholder.com/400?text=TryOn+Result"}