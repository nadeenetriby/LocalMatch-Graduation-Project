# 🤖 AI Server Setup - CLIP Model Integration

## Overview
Your `ai_server.py` now uses CLIP embeddings + FAISS for fast semantic search. It works with both text and image queries.

## Setup Steps

### 1. **Install Python Dependencies**

```powershell
# Create/activate Python environment
python -m venv ai_env
ai_env\Scripts\activate

# Install requirements
pip install fastapi uvicorn torch transformers pillow numpy faiss-cpu requests pydantic
```

### 2. **Add Your Kaggle Embeddings**

#### Option A: Copy from Kaggle (Recommended)
1. Download your embeddings from Kaggle:
   - `image_embeddings.npy` 
   - `text_embeddings.npy` (optional)
   - `image_urls.jsonl`

2. Create directory and add files:
```powershell
mkdir embeddings_cache
# Copy the 3 files into embeddings_cache/
```

#### Option B: Generate Embeddings (First Time)
If you haven't pre-computed embeddings yet, use your notebook to:
1. Load product images from your database
2. Process with CLIP model
3. Save embeddings to `embeddings_cache/`

See the notebook cells for `save embeddings` pattern.

### 3. **Start AI Server**

```powershell
# Activate environment (if not already)
ai_env\Scripts\activate

# Start server
python -m uvicorn ai_server:app --reload --port 8000
```

Expected output:
```
Uvicorn running on http://127.0.0.1:8000
✅ CLIP model loaded
✅ FAISS index built with 5000+ vectors
```

## API Endpoints

### `/search-text` (POST)
Text-based search
```bash
curl -X POST http://localhost:8000/search-text \
  -H "Content-Type: application/json" \
  -d '{"query": "blue oversized shirt"}'
```

Response:
```json
{
  "results": ["url1.jpg", "url2.jpg", ...],
  "count": 10,
  "time": "0.045s"
}
```

### `/search-image` (POST)
Image file upload
```bash
curl -X POST http://localhost:8000/search-image \
  -F "file=@product.jpg"
```

### `/search-image-url` (POST)
Image URL search
```bash
curl -X POST http://localhost:8000/search-image-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/image.jpg"}'
```

## Integration with Express Backend

Your Express backend already forwards AI requests:
- Frontend → `/api/ai/search-text` → Express → forwards to `http://localhost:8000/search-text` → Python AI Server

This already works in `server/routes/ai.js`

## Using Custom CLIP Model (from Kaggle)

If you want to use your fine-tuned CLIP model instead of the default:

1. Download from Kaggle
2. Save to `./clip_model/` directory
3. The ai_server will auto-load it

Files needed:
```
./clip_model/
├── config.json
├── model.safetensors
├── preprocessor_config.json
└── ...
```

## Testing in Frontend

1. Start all 3 servers:
   ```powershell
   # Terminal 1: Frontend
   cd lokalmatch && npm run dev  # http://localhost:5174

   # Terminal 2: Backend
   cd server && npm run dev  # http://localhost:5000

   # Terminal 3: AI Server
   ai_env\Scripts\activate && python -m uvicorn ai_server:app --reload --port 8000
   ```

2. Visit search page and enter a query
3. Check browser console for API calls

## Troubleshooting

### ❌ CLIP model not loading
```
pip install --upgrade transformers torch
```

### ❌ FAISS index not found
Ensure `embeddings_cache/` exists with:
- `image_embeddings.npy`
- `image_urls.jsonl`

### ❌ Request timing out
- Check CLIP model is on GPU if available
- Reduce batch size in search functions

### ❌ Port 8000 already in use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000
# Kill it
taskkill /PID <PID> /F
```

## Performance Tips

1. **GPU Usage**: Models automatically use GPU if available
   - Check in logs: `Device: cuda`

2. **Batch Processing**: Current setup handles single queries
   - Easy to extend for batch searches

3. **Caching**: FAISS index is loaded once on startup
   - Fast searches (< 100ms per query)

## Next Steps

1. ✅ Download embeddings from Kaggle
2. ✅ Run ai_server on port 8000
3. ✅ Test endpoints with curl/Postman
4. ✅ Search from frontend
5. 🎯 Add Arabic support (use your Qwen model from notebook)
6. 🎯 Fine-tune CLIP on your fashion dataset
