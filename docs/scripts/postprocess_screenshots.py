#!/usr/bin/env python3
from __future__ import annotations

import sys
import re
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).resolve().parents[2]
USER_MANUAL = ROOT / "docs" / "app_docs" / "user_manual.md"
POSTPROCESS_MARKER_KEY = "orion_docs_postprocessed"
POSTPROCESS_MARKER_VALUE = "1920x1080-v1"


def load_caption_map() -> dict[str, str]:
    if not USER_MANUAL.exists():
        return {}

    captions: dict[str, str] = {}
    lines = USER_MANUAL.read_text().splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("```{figure} ../screenshots/"):
            filename = line.split("../screenshots/", 1)[1].strip()
            caption = ""
            j = i + 1
            while j < len(lines):
                current = lines[j]
                if current.strip() == "```":
                    break
                if current.strip() and not current.lstrip().startswith(":"):
                    caption = " ".join(current.split())
                j += 1
            if filename and filename not in captions:
                captions[filename] = caption or filename.rsplit(".", 1)[0].replace("-", " ").title()
                captions[Path(filename).name] = captions[filename]
                undated_name = re.sub(r"-\d{8}(\.[^.]+)$", r"\1", Path(filename).name)
                captions[undated_name] = captions[filename]
            i = j
        i += 1
    return captions


CAPTION_MAP = load_caption_map()


def label_for_path(path: Path) -> str:
    label = CAPTION_MAP.get(path.name)
    if label:
        return label

    undated_name = re.sub(r"-\d{8}(\.[^.]+)$", r"\1", path.name)
    stem = Path(undated_name).stem
    return re.sub(r"\s+", " ", stem.replace("-", " ")).strip().title()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=max(0, radius), fill=255)
    return mask


@lru_cache(maxsize=None)
def render_border(
    size: tuple[int, int],
    radius: int,
    border_width: int,
    color: tuple[int, int, int, int],
    scale: int = 4,
) -> Image.Image:
    width, height = size
    hi_size = (width * scale, height * scale)
    hi_radius = max(1, radius * scale)
    hi_border = max(1, border_width * scale)

    outer_mask = rounded_mask(hi_size, hi_radius)

    inner_mask = Image.new("L", hi_size, 0)
    inner_width = max(1, hi_size[0] - (hi_border * 2))
    inner_height = max(1, hi_size[1] - (hi_border * 2))
    inner_radius = max(0, hi_radius - hi_border)
    inner_shape = rounded_mask((inner_width, inner_height), inner_radius)
    inner_mask.paste(inner_shape, (hi_border, hi_border))

    border_mask = ImageChops.subtract(outer_mask, inner_mask)
    border = Image.new("RGBA", hi_size, color)
    border.putalpha(ImageChops.multiply(border.getchannel("A"), border_mask))
    return border.resize(size, Image.Resampling.LANCZOS)


@lru_cache(maxsize=None)
def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def normalize_canvas(
    image: Image.Image,
    target_size: tuple[int, int],
) -> Image.Image:
    target_width, target_height = target_size
    width, height = image.size

    scale = min(target_width / max(1, width), target_height / max(1, height), 1)
    resized_width = max(1, round(width * scale))
    resized_height = max(1, round(height * scale))
    resized = image.resize((resized_width, resized_height), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    offset_x = 0 if resized_width >= target_width else (target_width - resized_width) // 2
    offset_y = 0 if resized_height >= target_height else (target_height - resized_height) // 2
    canvas.alpha_composite(resized, (offset_x, offset_y))
    return canvas


def add_label(image: Image.Image, label: str) -> Image.Image:
    if not label:
        return image

    draw = ImageDraw.Draw(image)
    width, height = image.size
    font = load_font(max(14, width // 68))
    max_text_width = int(width * 0.52)
    text = label

    while draw.textlength(text, font=font) > max_text_width and len(text) > 12:
        text = text[:-4].rstrip(". ") + "..."

    left = 26
    right_margin = 26
    bottom_margin = 26
    padding_x = 10
    padding_y = 7

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    max_right = width - right_margin
    top = max(26, height - bottom_margin - text_h - (padding_y * 2))
    right = min(max_right, left + text_w + (padding_x * 2))
    bottom = height - bottom_margin

    draw.rounded_rectangle(
        (left, top, right, bottom),
        radius=10,
        fill=(7, 15, 26, 235),
    )
    draw.text(
        (left + padding_x, top + padding_y - 1),
        text,
        font=font,
        fill=(247, 250, 252, 255),
    )
    return image


def process_image(
    path: Path,
    crop_top: int = 0,
    crop_right: int = 0,
    crop_bottom: int = 0,
    radius: int = 42,
    final_trim: int = 0,
    border_width: int = 3,
    target_size: tuple[int, int] = (1920, 1080),
) -> None:
    source = Image.open(path)
    if source.size == target_size and source.info.get(POSTPROCESS_MARKER_KEY) == POSTPROCESS_MARKER_VALUE:
        return

    image = source.convert("RGBA")
    label = label_for_path(path)

    width, height = image.size

    new_width = max(1, width - crop_right)
    new_height = max(1, height - crop_top - crop_bottom)
    image = image.crop((0, crop_top, new_width, crop_top + new_height))

    effective_radius = max(1, radius - final_trim)
    if final_trim > 0 and image.size[0] > final_trim * 2 and image.size[1] > final_trim * 2:
        image = image.crop((final_trim, final_trim, image.size[0] - final_trim, image.size[1] - final_trim))

    old_scale = min(target_size[0] / max(1, image.size[0]), target_size[1] / max(1, image.size[1]))
    final_radius = max(1, round(effective_radius * old_scale))

    canvas = normalize_canvas(image, target_size)
    canvas = add_label(canvas, label)

    mask = rounded_mask(canvas.size, final_radius)
    rounded = Image.new("RGBA", canvas.size, (7, 15, 26, 255))
    rounded.paste(canvas, (0, 0), mask)
    canvas = rounded

    if border_width > 0:
        accent = render_border(
            size=canvas.size,
            radius=final_radius,
            border_width=border_width,
            color=(255, 255, 255, 255),
        )
        canvas.alpha_composite(accent)

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text(POSTPROCESS_MARKER_KEY, POSTPROCESS_MARKER_VALUE)
    canvas.save(path, pnginfo=metadata)


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: postprocess_screenshots.py <png-path> [<png-path> ...]")
        return 1

    for raw_path in sys.argv[1:]:
        path = Path(raw_path)
        if path.suffix.lower() != ".png" or not path.exists():
            continue
        process_image(path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
