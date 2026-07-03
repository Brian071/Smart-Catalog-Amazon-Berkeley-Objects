from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from core import Embedder, VectorStore, ImageSegmenter
from reasoning import SemanticReasoningEngine
from xai_arithmetic import VectorArithmetic, XAIEngine, TRIAL_228_CONFIG
from qdrant_client.http.models import Distance, VectorParams, PointStruct
import io
import uuid
from PIL import Image
import os
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="SOTA E-Commerce Visual Search Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedder = Embedder()
vector_store = VectorStore()
segmenter = ImageSegmenter()
reasoning_engine = SemanticReasoningEngine()
xai_engine = XAIEngine(embedder.model)
vector_arithmetic = VectorArithmetic()

class ArithmeticRequest(BaseModel):
    base_image_id: str
    add_text: Optional[str] = None
    subtract_text: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Engine running smoothly"}

@app.post("/index_image")
async def index_image(id: str = Form(...), file: UploadFile = File(...)):
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    segmented_image = segmenter.segment_shoe(image)
    vector = embedder.get_image_embedding(segmented_image)

    vector_store.insert_image(id=id, vector=vector, payload={"original_filename": file.filename})
    return {"status": "indexed", "id": id}

@app.get("/search/semantic")
def search_semantic(query: str):
    expanded_res = reasoning_engine.expand_query(query)
    query_vector = embedder.get_text_embedding(expanded_res["expanded_text"])

    results = vector_store.search(
        query_vector=query_vector,
        limit=5,
        threshold=None
    )

    formatted_results = []
    for res in results:
        formatted_results.append({
            "id": res.payload.get("original_id", res.id),
            "score": res.score,
            "payload": res.payload
        })

    return {
        "expanded_query": expanded_res["expanded_text"],
        "corrected_query": expanded_res["corrected_query"],
        "has_typo": expanded_res["has_typo"],
        "results": formatted_results
    }

@app.post("/search/compositional")
def search_compositional(req: ArithmeticRequest):
    uuid_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, req.base_image_id))
    try:
        retrieve_result = vector_store.client.retrieve(
            collection_name=vector_store.collection_name,
            ids=[uuid_id],
            with_vectors=True
        )
        if not retrieve_result:
            raise HTTPException(status_code=404, detail="Base image ID not found")
        base_vector = retrieve_result[0].vector
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    add_vecs = []
    sub_vecs = []

    if req.add_text:
        add_vecs.append(embedder.get_text_embedding(req.add_text))
    if req.subtract_text:
        sub_vecs.append(embedder.get_text_embedding(req.subtract_text))

    final_vector = vector_arithmetic.manipulate_vector(base_vector, subtract_vectors=sub_vecs, add_vectors=add_vecs)

    results = vector_store.search(
        query_vector=final_vector,
        limit=5,
        threshold=None
    )

    formatted_results = []
    for res in results:
        formatted_results.append({
            "id": res.payload.get("original_id", res.id),
            "score": res.score,
            "payload": res.payload
        })

    return {
        "results": formatted_results
    }

@app.get("/xai/heatmap")
def get_heatmap(image_id: str, query: str):
    dummy_img = Image.new('RGB', (224, 224), color = 'white')
    heatmap_matrix = xai_engine.generate_attention_heatmap(dummy_img, query)
    return {
        "image_id": image_id,
        "query": query,
        "heatmap_shape": heatmap_matrix.shape,
        "status": "success (mocked)"
    }

build_dir = "/content/Smart-Catalog-Amazon-Berkeley-Objects/frontend/build"
if os.path.exists(build_dir):
    app.mount("/", StaticFiles(directory=build_dir, html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
