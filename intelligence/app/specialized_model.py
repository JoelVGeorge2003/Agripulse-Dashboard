import json
import re
import httpx

from .config import get_settings


def parse_json(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.I)
    value = json.loads(cleaned)
    if not isinstance(value, dict):
        raise ValueError("Model response is not an object")
    return value


async def generate(system_prompt: str, payload: dict) -> tuple[dict, str, str]:
    settings = get_settings()
    user_content = json.dumps(payload, separators=(",", ":"), default=str)
    if settings.chat_provider.lower() == "openai" and settings.openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=45) as client:
                response = await client.post(f"{settings.openai_base_url}/responses", headers={"Authorization": f"Bearer {settings.openai_api_key}"}, json={"model": settings.openai_model, "instructions": system_prompt, "input": user_content, "text": {"format": {"type": "json_object"}, "verbosity": "low"}})
                response.raise_for_status()
                text = next(content.get("text", "") for output in response.json().get("output", []) if output.get("type") == "message" for content in output.get("content", []) if content.get("type") == "output_text")
                return parse_json(text), "openai", settings.openai_model
        except Exception:
            pass
    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        response = await client.post(f"{settings.ollama_base_url}/api/chat", json={"model": settings.ollama_model, "stream": False, "format": "json", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}], "options": {"temperature": 0, "num_predict": 450}})
        response.raise_for_status()
        body = response.json()
        return parse_json(str(body.get("message", {}).get("content", ""))), "ollama", str(body.get("model") or settings.ollama_model)
