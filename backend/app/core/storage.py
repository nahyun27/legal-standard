"""사건 파일 저장. 로컬 디스크(STORAGE_DIR)에 무작위 이름으로 저장하고, 원래 파일명은 DB 에만 둔다.
운영에서는 비공개 버킷(S3 SSE)으로 바꿀 자리 — save/open_path 두 함수만 갈아끼우면 된다."""

import hashlib
import os
import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

# 법원·수사기관 제출 자료로 흔한 형식만 받는다(실행 파일 등 차단)
ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png", ".heic", ".gif", ".webp", ".doc", ".docx", ".hwp", ".hwpx", ".txt", ".xlsx", ".xls", ".csv", ".zip", ".m4a", ".mp3", ".mp4"}


def _root() -> Path:
    root = Path(settings.STORAGE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save(upload: UploadFile) -> tuple[str, int, str]:
    """(stored_name, size, sha256). 확장자·크기를 검사하고, 한도를 넘으면 쓰던 파일을 지운다."""
    filename = upload.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"올릴 수 없는 파일 형식입니다({ext or '확장자 없음'}).")
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    stored = secrets.token_hex(16) + ext
    path = _root() / stored
    digest = hashlib.sha256()
    size = 0
    with path.open("wb") as out:
        while chunk := upload.file.read(1024 * 1024):
            size += len(chunk)
            if size > limit:
                out.close()
                path.unlink(missing_ok=True)
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"파일은 {settings.MAX_UPLOAD_MB}MB 까지 올릴 수 있습니다.")
            digest.update(chunk)
            out.write(chunk)
    if size == 0:
        path.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="빈 파일입니다.")
    return stored, size, digest.hexdigest()


def open_path(stored_name: str) -> Path:
    path = _root() / stored_name
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="파일을 찾을 수 없습니다.")
    return path
