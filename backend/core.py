import torch
from transformers import CLIPProcessor, CLIPModel
import numpy as np
from PIL import Image
import cv2
import uuid
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

# Load CLIP Model
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

class Embedder:
    def __init__(self, model_id="openai/clip-vit-base-patch32"):
        self.model = CLIPModel.from_pretrained(model_id).to(device)
        self.processor = CLIPProcessor.from_pretrained(model_id)

    def get_text_embedding(self, text):
        inputs = self.processor(text=[text], return_tensors="pt", padding=True, truncation=True, max_length=77).to(device)
        with torch.no_grad():
            outputs = self.model.get_text_features(**inputs)
            if not isinstance(outputs, torch.Tensor):
                text_features = outputs[0]
            else:
                text_features = outputs
        text_features = text_features / text_features.norm(p=2, dim=-1, keepdim=True)
        return [float(x) for x in text_features[0].cpu().numpy().flatten().tolist()[:512]]

    def get_image_embedding(self, image: Image.Image):
        inputs = self.processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = self.model.get_image_features(**inputs)
            if not isinstance(outputs, torch.Tensor):
                image_features = outputs[0]
            else:
                image_features = outputs
        image_features = image_features / image_features.norm(p=2, dim=-1, keepdim=True)
        return [float(x) for x in image_features[0].cpu().numpy().flatten().tolist()[:512]]

class VectorStore:
    def __init__(self, host="localhost", port=6333, collection_name="shoes"):
        self.client = QdrantClient(":memory:")
        self.collection_name = collection_name
        self.setup_collection()

    def setup_collection(self):
        try:
            self.client.get_collection(collection_name=self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=512, distance=Distance.COSINE),
            )

    def insert_image(self, id: str, vector: list, payload: dict = None):
        uuid_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, id))
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                PointStruct(
                    id=uuid_id,
                    vector=vector,
                    payload={"original_id": id, **(payload or {})}
                )
            ]
        )

    def search(self, query_vector: list, limit=5, threshold=None):
        try:
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit,
                score_threshold=threshold
            )
            return search_result
        except Exception as e:
            print("Vector store search error:", e)
            return []

class ImageSegmenter:
    def __init__(self):
        pass

    def segment_shoe(self, image: Image.Image) -> Image.Image:
        cv_img = np.array(image.convert("RGB"))
        h, w = cv_img.shape[:2]
        mask = np.zeros(cv_img.shape[:2], np.uint8)
        bgdModel = np.zeros((1,65),np.float64)
        fgdModel = np.zeros((1,65),np.float64)
        rect = (int(w*0.1), int(h*0.1), int(w*0.8), int(h*0.8))

        cv2.grabCut(cv_img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
        mask2 = np.where((mask==2)|(mask==0), 0, 1).astype('uint8')

        img_segmented = cv_img * mask2[:, :, np.newaxis]
        white_bg = np.ones_like(cv_img) * 255
        white_bg_masked = white_bg * (1 - mask2[:, :, np.newaxis])
        final_img = img_segmented + white_bg_masked

        return Image.fromarray(final_img.astype(np.uint8))
