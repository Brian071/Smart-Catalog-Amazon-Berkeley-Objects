from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import difflib

class SemanticReasoningEngine:
    def __init__(self, model_name="google/flan-t5-small"):
        """
        Uses a lightweight instruction-tuned LLM (Flan-T5) to reason about queries.
        """
        print(f"Loading reasoning engine: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

        # Simple dictionary for spell checking / query suggestion mock
        self.dictionary = ["leather", "sneaker", "formal", "black", "white", "elegant", "wedding", "canvas", "shoe", "shoes", "muddy", "outdoor", "red", "lace", "party", "run", "running"]

    def suggest_correction(self, word: str) -> str:
        # Very basic spell checker using difflib
        matches = difflib.get_close_matches(word.lower(), self.dictionary, n=1, cutoff=0.7)
        if matches:
            # maintain original case if possible, or just return lowercase match
            return matches[0]
        return word

    def expand_query(self, query: str) -> dict:
        """
        Expands an ambiguous query (e.g. "black shoes")
        or breaks down a situational query into semantic attributes.
        Also includes spell checking / typo correction.
        """
        words = query.split()
        corrected_words = [self.suggest_correction(w) for w in words]
        corrected_query = " ".join(corrected_words)

        has_typo = corrected_query.lower() != query.lower()

        prompt = (
            f"Extract visual attributes from this user situation: {corrected_query} ->"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(**inputs, max_length=50)
        expanded_text = self.tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]

        return {
            "expanded_text": expanded_text.strip(),
            "corrected_query": corrected_query if has_typo else None,
            "has_typo": has_typo
        }
