"""모델 호출 — 제공자를 바꿔 끼울 수 있게 한 겹 감싼다.

generate(system, messages, max_tokens) -> (text, usage)
- messages: [{"role": "user" | "assistant", "text": str}]
- usage: {"input_tokens": int | None, "output_tokens": int | None, "model": str}

bedrock: 서버 IAM 역할(legalstandard-ec2)로 Bedrock Converse API 를 부른다 — 키를 두지 않는다.
  역할에 bedrock:InvokeModel 권한(해당 모델·inference profile 한정)이 있어야 한다.
fake: 입력으로 정해지는 고정 문장. 개발·테스트용 — 실제 사건에 쓰지 않는다.
사건 내용은 로그에 남기지 않는다(예외 메시지에도 본문을 넣지 않는다).
"""

import hashlib

from app.core.config import settings


class DraftingDisabled(RuntimeError):
    pass


class LLMError(RuntimeError):
    pass


def model_name() -> str:
    if settings.LLM_PROVIDER == "bedrock":
        return settings.BEDROCK_MODEL_ID
    if settings.LLM_PROVIDER == "fake":
        return "fake"
    return ""


def generate(system: str, messages: list[dict], max_tokens: int | None = None) -> tuple[str, dict]:
    if not settings.drafting_enabled:
        raise DraftingDisabled("AI 초안 생성이 아직 설정되지 않았습니다.")
    max_tokens = max_tokens or settings.LLM_MAX_TOKENS
    if settings.LLM_PROVIDER == "bedrock":
        return _bedrock(system, messages, max_tokens)
    return _fake(system, messages)


_client = None


def _bedrock_client():
    global _client
    if _client is None:
        import boto3
        from botocore.config import Config

        # 긴 서면은 응답까지 1~2분 걸릴 수 있다
        _client = boto3.client("bedrock-runtime", region_name=settings.BEDROCK_REGION,
                               config=Config(read_timeout=300, connect_timeout=10, retries={"max_attempts": 2, "mode": "standard"}))
    return _client


def _bedrock(system: str, messages: list[dict], max_tokens: int) -> tuple[str, dict]:
    from botocore.exceptions import BotoCoreError, ClientError

    try:
        res = _bedrock_client().converse(
            modelId=settings.BEDROCK_MODEL_ID,
            system=[{"text": system}],
            messages=[{"role": m["role"], "content": [{"text": m["text"]}]} for m in messages],
            inferenceConfig={"maxTokens": max_tokens},
        )
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "ClientError")
        raise LLMError(f"Bedrock 호출 실패({code})") from None
    except BotoCoreError as e:
        raise LLMError(f"Bedrock 연결 실패({type(e).__name__})") from None
    parts = res.get("output", {}).get("message", {}).get("content", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise LLMError("모델이 빈 응답을 돌려주었습니다.")
    if res.get("stopReason") == "max_tokens":
        text += "\n\n[확인 필요: 출력 길이 한도에 걸려 초안이 중간에 끝났습니다. 다시 생성하거나 나머지를 직접 작성하세요.]"
    usage = res.get("usage", {})
    return text, {"input_tokens": usage.get("inputTokens"), "output_tokens": usage.get("outputTokens"), "model": settings.BEDROCK_MODEL_ID}


def _fake(system: str, messages: list[dict]) -> tuple[str, dict]:
    """입력에서 섹션 제목만 뽑아 고정 형식의 초안을 만든다. 같은 입력이면 같은 결과."""
    user = messages[-1]["text"] if messages else ""
    titles = [line[4:].strip() for line in user.splitlines() if line.startswith("### ")]
    digest = hashlib.sha256((system + user).encode()).hexdigest()[:8]
    body = [f"(개발용 가짜 초안 · {digest})", ""]
    for t in titles or ["본문"]:
        body += [t, "[확인 필요: 실제 모델이 연결되면 이 부분이 작성됩니다]", ""]
    return "\n".join(body).strip(), {"input_tokens": len(system + user) // 2, "output_tokens": 50, "model": "fake"}
