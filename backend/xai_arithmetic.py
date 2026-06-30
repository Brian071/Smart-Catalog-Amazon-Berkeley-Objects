import numpy as np

class VectorArithmetic:
    @staticmethod
    def manipulate_vector(base_vector, subtract_vectors=None, add_vectors=None):
        base = np.array(base_vector)
        result = base.copy()

        if subtract_vectors:
            for vec in subtract_vectors:
                result -= np.array(vec)

        if add_vectors:
            for vec in add_vectors:
                result += np.array(vec)

        # L2 Normalize
        norm = np.linalg.norm(result)
        if norm > 0:
            result = result / norm

        return result.tolist()

class XAIEngine:
    def __init__(self, clip_model):
        self.model = clip_model

    def generate_attention_heatmap(self, image, text_query):
        # Mock Heatmap
        mock_heatmap = np.random.rand(224, 224)
        mock_heatmap = (mock_heatmap * 255).astype(np.uint8)
        return mock_heatmap

TRIAL_228_CONFIG = {
    "similarity_threshold": 0.285,
    "limit_top_k": 50,
    "temperature": 0.07,
    "margin": 0.1
}
