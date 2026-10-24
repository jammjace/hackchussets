import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BenchmarkClip:
    filename: str
    video_id: str
    ingredient: str
    original_timestamp_offset: float


def load_benchmark_clips(
    metadata_path: str | Path, mapping_path: str | Path
) -> dict[str, BenchmarkClip]:
    """Join explicit local filenames to EPIC metadata by video_id."""
    metadata = json.loads(Path(metadata_path).read_text(encoding="utf-8"))
    mapping = json.loads(Path(mapping_path).read_text(encoding="utf-8"))
    by_id = {entry["video_id"]: entry for entry in metadata}
    clips = {}
    for filename, configured in mapping.items():
        video_id = configured["video_id"]
        if video_id not in by_id:
            raise ValueError(f"mapping references unknown video_id {video_id!r}")
        entry = by_id[video_id]
        if configured["ingredient"].casefold() != entry["ingredient"].casefold():
            raise ValueError(f"ingredient mismatch for {filename}")
        clips[filename] = BenchmarkClip(
            filename=filename,
            video_id=video_id,
            ingredient=entry["ingredient"],
            original_timestamp_offset=float(entry["clip_start_original_s"]),
        )
    return clips
