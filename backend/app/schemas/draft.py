from pydantic import BaseModel, Field


class DraftGenerateIn(BaseModel):
    # 다시 생성할 때의 추가 지시 — 버전에 그대로 저장된다
    extra_prompt: str | None = Field(default=None, max_length=2000)
    # 이 버전을 바탕으로 고쳐 쓰기. 비우면 처음부터 생성
    base_version: int | None = Field(default=None, ge=1)


class DraftSaveIn(BaseModel):
    content: str = Field(min_length=1, max_length=200_000)
    base_version: int | None = Field(default=None, ge=1)
