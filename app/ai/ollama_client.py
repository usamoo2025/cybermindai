
import httpx
import os


class OllamaClient:

    def __init__(self):

        self.base_url = os.getenv(
            "OLLAMA_BASE_URL",
            "http://127.0.0.1:11434"
        )

        self.model = os.getenv(
            "OLLAMA_MODEL",
            "llama3.2:1b"
        )

        self.timeout = httpx.Timeout(
            timeout=600.0,
            connect=10.0,
            read=600.0,
            write=600.0,
            pool=10.0
        )

    async def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 500
    ) -> str:

        if not messages:
            raise ValueError("Messages cannot be empty.")

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "think": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 2048,
                "num_threads": 8
            }
        }

        try:

            async with httpx.AsyncClient(
                timeout=self.timeout
            ) as client:

                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )

                response.raise_for_status()

                data = response.json()
                answer = data.get(
                    "message", {}
                ).get("content", "").strip()

                if not answer:
                    raise RuntimeError(
                        "Ollama returned an empty response."
                    )

                return answer

        except httpx.ConnectError as error:

            raise RuntimeError(
                "Cannot connect to Ollama. "
                "Check whether Ollama is running."
            ) from error

        except httpx.TimeoutException as error:

            raise RuntimeError(
                "Ollama request timed out."
            ) from error

        except httpx.HTTPStatusError as error:

            raise RuntimeError(
                f"Ollama API returned HTTP "
                f"{error.response.status_code}."
            ) from error
