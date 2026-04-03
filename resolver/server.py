from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from html import unescape
from pathlib import Path
from threading import Lock
from typing import Any
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

import yt_dlp
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel


DOWNLOAD_DIR = os.path.join(os.path.dirname(__file__), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
MODELS_DIR = Path(os.path.dirname(__file__)) / "models"
WHISPER_MODEL_PATH = MODELS_DIR / "ggml-base.bin"
WHISPER_MODEL_URL = (
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin?download=true"
)

app = FastAPI(title="VidGrab Local Resolver", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=2)
PREFERRED_SUBTITLE_LANGUAGES = ["zh-Hans", "zh-CN", "zh", "en", "en-US"]
TIMECODE_PATTERN = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2}[.,]\d{3})"
)
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")
ASR_CACHE: dict[str, list[dict[str, Any]]] = {}


class InfoRequest(BaseModel):
    url: str


class AnalyzePrepareResponse(BaseModel):
    source_url: str
    video_title: str
    transcript: list[dict[str, Any]]
    transcript_language: str | None = None


class DownloadRequest(BaseModel):
    url: str
    format: str = "best"
    quality: str | None = None


@dataclass
class TaskRecord:
    task_id: str
    status: str = "processing"
    progress: float = 0.0
    speed: str = "0KB/s"
    eta: int = 0
    file_path: str | None = None
    error: str | None = None


TASKS: dict[str, TaskRecord] = {}
TASK_LOCK = Lock()

PLATFORM_REFERERS = {
    "bilibili": "https://www.bilibili.com/",
    "youtube": "https://www.youtube.com/",
    "tiktok": "https://www.tiktok.com/",
    "instagram": "https://www.instagram.com/",
}


def _base_opts() -> dict[str, Any]:
    return {
        "quiet": True,
        "no_warnings": True,
        "no_color": True,
        "nocheckcertificate": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["all"],
    }


def _iter_cookie_strategies() -> list[dict[str, Any]]:
    return [
        {"cookiesfrombrowser": ("chrome",)},
        {"cookiesfrombrowser": ("edge",)},
        {},
    ]


def _extract_with_fallback(url: str, download: bool, extra_opts: dict[str, Any]) -> tuple[dict[str, Any], str]:
    errors: list[str] = []
    for strategy in _iter_cookie_strategies():
        opts = _base_opts()
        opts.update(extra_opts)
        opts.update(strategy)
        strategy_name = strategy.get("cookiesfrombrowser", ("none",))[0]
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info_obj = ydl.extract_info(url, download=download)
            return info_obj, str(strategy_name)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{strategy_name}: {exc}")
    raise ValueError(" | ".join(errors))


def _extract_formats(formats: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[tuple[str | None, int | None]] = set()
    for item in formats:
        if item.get("vcodec") == "none":
            continue
        height = item.get("height")
        width = item.get("width")
        ext = item.get("ext")
        if not height or not width:
            continue
        key = (ext, height)
        if key in seen:
            continue
        seen.add(key)
        size = item.get("filesize")
        size_mb = round(size / (1024 * 1024), 2) if size else None
        result.append(
            {
                "format_id": item.get("format_id"),
                "ext": ext,
                "quality": f"{height}p",
                "filesize": size,
                "filesize_mb": size_mb,
                "filesize_display": f"{size_mb} MB" if size_mb else "未知大小",
                "resolution": f"{width}x{height}",
                "fps": item.get("fps"),
                "fps_display": f"{item.get('fps')} FPS" if item.get("fps") else "未知",
            }
        )
    result.sort(key=lambda item: int(str(item.get("quality", "0p")).replace("p", "") or "0"), reverse=True)
    return result[:10]


def _pick_subtitle_track(info: dict[str, Any]) -> tuple[str | None, str | None]:
    subtitles = info.get("subtitles") or {}
    auto_captions = info.get("automatic_captions") or {}

    url, language = _pick_from_tracks(subtitles)
    if url:
        return url, language

    url, language = _pick_from_tracks(auto_captions)
    if url:
        return url, language

    bilibili_url, bilibili_language = _try_bilibili_subtitle(info)
    if bilibili_url:
        return bilibili_url, bilibili_language

    return None, None


def _pick_from_tracks(tracks: dict[str, Any]) -> tuple[str | None, str | None]:
    if not isinstance(tracks, dict) or not tracks:
        return None, None

    for lang in PREFERRED_SUBTITLE_LANGUAGES:
        selected = _pick_subtitle_entry(tracks.get(lang))
        if selected:
            return selected, lang

    for lang, entries in tracks.items():
        selected = _pick_subtitle_entry(entries)
        if selected:
            return selected, str(lang)
    return None, None


def _pick_subtitle_entry(entries: Any) -> str | None:
    if not isinstance(entries, list) or not entries:
        return None

    preferred_ext_order = ["vtt", "srt", "ttml", "srv3", "srv2", "srv1", "json3"]
    sorted_entries = sorted(
        entries,
        key=lambda item: preferred_ext_order.index(item.get("ext"))
        if item.get("ext") in preferred_ext_order
        else len(preferred_ext_order),
    )
    for entry in sorted_entries:
        subtitle_url = entry.get("url")
        ext = (entry.get("ext") or "").lower()
        if ext == "xml":
            continue
        if subtitle_url and "comment.bilibili.com" not in str(subtitle_url):
            return str(subtitle_url)
    return None


def _extract_bvid(info: dict[str, Any]) -> str | None:
    bvid_pattern = re.compile(r"(BV[0-9A-Za-z]{10})", re.IGNORECASE)

    for field in ("id", "webpage_url", "original_url"):
        value = info.get(field)
        if not isinstance(value, str):
            continue
        match = bvid_pattern.search(value)
        if match:
            return match.group(1)

    webpage_url = info.get("webpage_url")
    if isinstance(webpage_url, str):
        parsed = urlparse(webpage_url)
        query = parse_qs(parsed.query)
        bvid_values = query.get("bvid")
        if bvid_values:
            return bvid_values[0]
    return None


def _pick_bilibili_subtitle(subtitle_list: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not subtitle_list:
        return None

    for preferred in PREFERRED_SUBTITLE_LANGUAGES:
        for sub in subtitle_list:
            if (sub.get("lan") or "").lower() == preferred.lower():
                return sub
    return subtitle_list[0]


def _try_bilibili_subtitle(info: dict[str, Any]) -> tuple[str | None, str | None]:
    extractor_key = (info.get("extractor_key") or "").lower()
    if "bili" not in extractor_key:
        return None, None

    bvid = _extract_bvid(info)
    if not bvid:
        return None, None

    try:
        view_req = Request(
            f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urlopen(view_req, timeout=15) as view_resp:
            view_data = json.loads(view_resp.read().decode("utf-8", errors="ignore"))
        view_payload = view_data.get("data") or {}
        cid = view_payload.get("cid")
        if not cid:
            return None, None

        player_req = Request(
            f"https://api.bilibili.com/x/player/v2?cid={cid}&bvid={bvid}",
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": f"https://www.bilibili.com/video/{bvid}",
            },
        )
        with urlopen(player_req, timeout=15) as player_resp:
            player_data = json.loads(player_resp.read().decode("utf-8", errors="ignore"))
        subtitle_payload = ((player_data.get("data") or {}).get("subtitle") or {})
        subtitle_list = subtitle_payload.get("subtitles") or []
        selected = _pick_bilibili_subtitle(subtitle_list)
        if not selected:
            return None, None

        subtitle_url = selected.get("subtitle_url")
        if not subtitle_url:
            return None, None
        subtitle_url = str(subtitle_url)
        if subtitle_url.startswith("//"):
            subtitle_url = f"https:{subtitle_url}"
        return subtitle_url, str(selected.get("lan") or selected.get("lan_doc") or "zh")
    except Exception:
        return None, None


def _download_subtitle(subtitle_url: str) -> str:
    req = Request(subtitle_url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"本地字幕下载失败: {exc}") from exc


def _parse_json_subtitle(raw: str) -> list[dict[str, Any]]:
    content = raw.strip()
    if not content or not content.startswith("{"):
        return []

    try:
        payload = json.loads(content)
    except Exception:
        return []

    body = payload.get("body")
    if not isinstance(body, list):
        return []

    segments: list[dict[str, Any]] = []
    for item in body:
        if not isinstance(item, dict):
            continue
        start = float(item.get("from", 0))
        end = float(item.get("to", start))
        text = WHITESPACE_PATTERN.sub(" ", unescape(str(item.get("content") or ""))).strip()
        if not text:
            continue
        segments.append(
            {
                "start": round(start, 3),
                "end": round(end, 3),
                "timestamp": _format_timestamp(start),
                "text": text,
            }
        )
    return segments


def _build_segment(start: float, end: float, lines: list[str]) -> dict[str, Any] | None:
    text = " ".join(lines)
    text = HTML_TAG_PATTERN.sub("", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&")
    text = WHITESPACE_PATTERN.sub(" ", text).strip()
    if not text:
        return None
    return {
        "start": round(start, 3),
        "end": round(end, 3),
        "timestamp": _format_timestamp(start),
        "text": text,
    }


def _timecode_to_seconds(value: str) -> float:
    normalized = value.replace(",", ".")
    hours, minutes, seconds = normalized.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _format_timestamp(seconds: float) -> str:
    total_seconds = int(max(0, seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def _parse_subtitle(raw: str) -> list[dict[str, Any]]:
    json_segments = _parse_json_subtitle(raw)
    if json_segments:
        return json_segments

    segments: list[dict[str, Any]] = []
    current_start: float | None = None
    current_end: float | None = None
    buffer: list[str] = []

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped:
            if current_start is not None and buffer:
                segment = _build_segment(current_start, current_end or current_start, buffer)
                if segment:
                    segments.append(segment)
            current_start = None
            current_end = None
            buffer = []
            continue

        match = TIMECODE_PATTERN.search(stripped)
        if match:
            if current_start is not None and buffer:
                segment = _build_segment(current_start, current_end or current_start, buffer)
                if segment:
                    segments.append(segment)
            current_start = _timecode_to_seconds(match.group("start"))
            current_end = _timecode_to_seconds(match.group("end"))
            buffer = []
            continue

        if (
            stripped.startswith("WEBVTT")
            or stripped.startswith("NOTE")
            or stripped.startswith("Kind:")
            or stripped.startswith("Language:")
            or stripped.isdigit()
        ):
            continue

        buffer.append(stripped)

    if current_start is not None and buffer:
        segment = _build_segment(current_start, current_end or current_start, buffer)
        if segment:
            segments.append(segment)

    return segments


def _compact_transcript(segments: list[dict[str, Any]], max_segments: int = 220) -> list[dict[str, Any]]:
    deduped: list[dict[str, Any]] = []
    last_text = ""
    for segment in segments:
        text = str(segment.get("text") or "").strip()
        if not text or text == last_text:
            continue
        deduped.append(segment)
        last_text = text
        if len(deduped) >= max_segments:
            break
    return deduped


def _safe_filename(value: str) -> str:
    return re.sub(r"[<>:\"/\\\\|?*]+", "_", value).strip()


def _build_asr_cache_key(video_path: Path) -> str:
    try:
        stat = video_path.stat()
        return f"{video_path.resolve()}:{int(stat.st_mtime)}:{stat.st_size}"
    except Exception:
        return str(video_path.resolve())


def _find_local_video_file(info: dict[str, Any], url: str) -> Path | None:
    title = str(info.get("title") or "").strip()
    bvid = _extract_bvid(info) or _extract_bvid({"webpage_url": url})

    candidates: list[Path] = []
    download_dir = Path(DOWNLOAD_DIR)
    if download_dir.exists():
        for ext in ("*.mp4", "*.mkv", "*.webm", "*.mov"):
            candidates.extend(download_dir.glob(ext))

    if not candidates:
        return None

    if title:
        safe_title = _safe_filename(title)
        for path in candidates:
            if path.stem == title or path.stem == safe_title:
                return path

    if bvid:
        for path in candidates:
            if bvid.lower() in path.stem.lower():
                return path

    return None


def _download_media_for_asr(url: str, info: dict[str, Any]) -> Path | None:
    output_dir = Path(DOWNLOAD_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    media_id = _safe_filename(str(info.get("id") or "video")) or "video"
    outtmpl = str(output_dir / f"asr_src_{media_id}_%(autonumber)s.%(ext)s")
    try:
        info_obj, _ = _extract_with_fallback(
            url,
            download=True,
            extra_opts={
                "format": "bestaudio[ext=m4a]/bestaudio/best",
                "outtmpl": outtmpl,
                "noplaylist": True,
                "overwrites": True,
            },
        )
        with yt_dlp.YoutubeDL(_base_opts()) as ydl:
            downloaded = ydl.prepare_filename(info_obj)
        media_path = Path(downloaded)
        if media_path.exists():
            return media_path

        matching_files = [
            item
            for item in output_dir.glob(f"asr_src_{media_id}_*")
            if item.is_file()
        ]
        preferred_candidates = [
            item
            for item in matching_files
            if item.suffix.lower() not in {".xml", ".json", ".part", ".ytdl"}
        ]
        if preferred_candidates:
            return max(preferred_candidates, key=lambda item: item.stat().st_mtime)
    except Exception:
        return None
    return None


def _cleanup_temp_media(media_path: Path | None) -> None:
    if not media_path:
        return
    try:
        media_path.unlink(missing_ok=True)
    except Exception:
        pass


def _ensure_whisper_model() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if WHISPER_MODEL_PATH.exists():
        return

    req = Request(WHISPER_MODEL_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=120) as resp:
        WHISPER_MODEL_PATH.write_bytes(resp.read())


def _run_ffmpeg_with_progress(cmd: list[str]) -> None:
    process = subprocess.Popen(
        cmd,
        cwd=str(Path(__file__).resolve().parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="ignore",
        bufsize=1,
    )
    assert process.stdout is not None
    for _ in process.stdout:
        pass
    code = process.wait()
    if code != 0:
        raise RuntimeError(f"ffmpeg exited with code {code}")


def _transcribe_local_video_with_whisper(video_path: Path) -> list[dict[str, Any]]:
    ffmpeg_bin = shutil.which("ffmpeg")
    if not ffmpeg_bin:
        raise ValueError("本机未检测到 ffmpeg，无法进行 ASR 转写。")

    cache_key = _build_asr_cache_key(video_path)
    if cache_key in ASR_CACHE:
        return ASR_CACHE[cache_key]

    _ensure_whisper_model()

    resolver_root = Path(__file__).resolve().parent
    output_dir = Path(DOWNLOAD_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_srt = output_dir / f"asr_{uuid.uuid4().hex}.srt"

    model_rel = WHISPER_MODEL_PATH.relative_to(resolver_root).as_posix()
    out_rel = output_srt.relative_to(resolver_root).as_posix()

    run_error: Exception | None = None
    for use_gpu in (True, False):
        filter_expr = (
            f"whisper=model={model_rel}:language=zh:destination={out_rel}:format=srt"
            f":use_gpu={'true' if use_gpu else 'false'}"
        )
        cmd = [
            ffmpeg_bin,
            "-y",
            "-i",
            str(video_path),
            "-vn",
            "-af",
            filter_expr,
            "-progress",
            "pipe:1",
            "-nostats",
            "-f",
            "null",
            "-",
        ]
        try:
            _run_ffmpeg_with_progress(cmd)
            run_error = None
            break
        except Exception as exc:
            run_error = exc
            if output_srt.exists():
                output_srt.unlink(missing_ok=True)

    if run_error is not None:
        raise ValueError(f"ASR 转写失败: {run_error}") from run_error

    if not output_srt.exists():
        raise ValueError("ASR 转写失败：未生成字幕文件。")

    try:
        content = output_srt.read_text(encoding="utf-8", errors="ignore")
        segments = _parse_subtitle(content)
        if segments:
            ASR_CACHE[cache_key] = segments
        return segments
    finally:
        try:
            output_srt.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/info")
def info(req: InfoRequest) -> dict[str, Any]:
    try:
        info_obj, strategy = _extract_with_fallback(
            req.url,
            download=False,
            extra_opts={"skip_download": True},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"本地解析失败: {exc}") from exc

    return {
        "title": info_obj.get("title", "Unknown"),
        "duration": int(round(info_obj.get("duration", 0))) if info_obj.get("duration") else None,
        "thumbnail": info_obj.get("thumbnail"),
        "platform": (info_obj.get("extractor_key") or "").lower(),
        "uploader": info_obj.get("uploader"),
        "view_count": info_obj.get("view_count"),
        "formats": _extract_formats(info_obj.get("formats", [])),
        "note": f"由本地解析助手提供（策略: {strategy}）",
    }


@app.post("/api/analyze/prepare")
def analyze_prepare(req: InfoRequest) -> AnalyzePrepareResponse:
    try:
        info_obj, _ = _extract_with_fallback(
            req.url,
            download=False,
            extra_opts={"skip_download": True},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"本地解析失败: {exc}") from exc

    subtitle_url, language = _pick_subtitle_track(info_obj)
    transcript: list[dict[str, Any]] = []
    temp_media_path: Path | None = None

    if subtitle_url:
        try:
            transcript = _compact_transcript(_parse_subtitle(_download_subtitle(subtitle_url)))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    else:
        local_video_path = _find_local_video_file(info_obj, req.url)
        if not local_video_path:
            local_video_path = _download_media_for_asr(req.url, info_obj)
            temp_media_path = local_video_path

        try:
            if local_video_path:
                transcript = _compact_transcript(_transcribe_local_video_with_whisper(local_video_path))
                language = "zh-ASR"
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        finally:
            _cleanup_temp_media(temp_media_path)

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="当前视频未检测到可用字幕，且本地转写也未成功，暂时无法执行 AI 分析。",
        )

    return AnalyzePrepareResponse(
        source_url=req.url,
        video_title=str(info_obj.get("title") or "未命名视频"),
        transcript=transcript,
        transcript_language=language,
    )


def _update_task(task_id: str, **fields: Any) -> None:
    with TASK_LOCK:
        task = TASKS.get(task_id)
        if not task:
            return
        for key, value in fields.items():
            setattr(task, key, value)


def _build_format_selector(fmt: str, quality: str | None) -> str:
    if quality:
        return f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
    return fmt or "best"


def _run_download(task_id: str, req: DownloadRequest) -> None:
    def hook(payload: dict[str, Any]) -> None:
        if payload.get("status") == "downloading":
            _update_task(
                task_id,
                progress=float(str(payload.get("_percent_str", "0")).replace("%", "").strip() or 0),
                speed=str(payload.get("_speed_str", "0KB/s")),
            )
        elif payload.get("status") == "finished":
            _update_task(task_id, progress=100.0)

    try:
        info_obj, _ = _extract_with_fallback(
            req.url,
            download=True,
            extra_opts={
                "format": _build_format_selector(req.format, req.quality),
                "outtmpl": os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s"),
                "progress_hooks": [hook],
                "overwrite": True,
            },
        )
        with yt_dlp.YoutubeDL(_base_opts()) as ydl:
            file_path = ydl.prepare_filename(info_obj)
        _update_task(task_id, status="completed", progress=100.0, file_path=file_path)
    except Exception as exc:  # noqa: BLE001
        _update_task(task_id, status="failed", error=f"本地下载失败: {exc}")


@app.post("/api/download")
def download(req: DownloadRequest) -> dict[str, str]:
    task_id = str(uuid.uuid4())
    with TASK_LOCK:
        TASKS[task_id] = TaskRecord(task_id=task_id)
    executor.submit(_run_download, task_id, req)
    return {"task_id": task_id, "status": "processing"}


@app.get("/api/proxy/image")
def proxy_image(
    url: str = Query(..., description="图片 URL"),
    platform: str | None = Query(None, description="平台名"),
) -> Response:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    if platform and platform in PLATFORM_REFERERS:
        headers["Referer"] = PLATFORM_REFERERS[platform]
    try:
        req = Request(url, headers=headers)
        with urlopen(req, timeout=15) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "image/jpeg")
        return Response(content=data, media_type=content_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"本地图片代理失败: {exc}") from exc


@app.get("/api/download/status/{task_id}")
def download_status(task_id: str) -> dict[str, Any]:
    with TASK_LOCK:
        task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "task_id": task.task_id,
        "status": task.status,
        "progress": task.progress,
        "speed": task.speed,
        "eta": task.eta,
        "file_path": task.file_path,
        "error": task.error,
    }


@app.get("/api/download/file/{task_id}")
def download_file(task_id: str) -> FileResponse:
    with TASK_LOCK:
        task = TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    if task.status != "completed" or not task.file_path:
        raise HTTPException(status_code=400, detail="任务尚未完成")
    if not os.path.exists(task.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    filename = os.path.basename(task.file_path)
    return FileResponse(path=task.file_path, filename=filename, media_type="application/octet-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=61337, reload=False)
