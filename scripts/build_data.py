from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path


DEFAULT_VAULT_DIR = "/Users/jackywine/Documents/Jackywine2025_Obsidian_Vault"
VAULT_DIR = Path(os.environ.get("PROMPT_SOURCE_DIR", DEFAULT_VAULT_DIR))
SOURCE_DIR = VAULT_DIR / "常用提示词"
OUTPUT_FILE = Path("/Users/jackywine/Documents/2026 常用 skills 汇总/data/prompts.js")


@dataclass(frozen=True)
class Category:
    id: str
    name: str
    description: str


CATEGORIES = [
    Category("thinking", "提问与思考框架", "聚焦拆解问题、识别矛盾、校正偏差和强化判断。"),
    Category("research", "研究与分析", "适合做深度研究、领域扫描、问题洞察和预测分析。"),
    Category("writing", "写作与表达", "覆盖长文、标题、推文、通俗表达和去 AI 味改写。"),
    Category("learning", "学习与阅读", "帮助读书、理解难内容、降低认知门槛和组织知识。"),
    Category("visual", "视觉生成与演示", "面向生图、视觉风格、PPT 和多媒体内容生产。"),
    Category("workflow", "AI 系统与工作流", "整理系统提示词、工具流、技能流和 AI 协作方式。"),
]


MANUAL_CATEGORY_MAP = {
    "AI 优化提示词的提示词.md": "workflow",
    "AI编程测试提示词.md": "workflow",
    "Dan koe 长文写作风格提示词.md": "writing",
    "Youmind Slide System Prompt.md": "visual",
    "flomo 领航员主视觉提示词.md": "visual",
    "flomo 领航员问题洞察提示词.md": "research",
    "gemini 高斯泼溅提示词小红书学习.md": "visual",
    "一键生成一套表情包提示词.md": "visual",
    "主席指点迷津提示词.md": "thinking",
    "乔哈里窗提示词.md": "thinking",
    "人类十大认知偏差陷阱防御提示词.md": "thinking",
    "十大人类顶级思维模型的对应提示词.md": "thinking",
    "取核心价值标题提示词.md": "writing",
    "各 Ai 公司官方系统提示词.md": "workflow",
    "向 Lovable 重新学习 Vibecoding 的提示词.md": "workflow",
    "多视频报告汇总提示词.md": "research",
    "大白话讲技术.md": "writing",
    "太奶提示词.md": "learning",
    "完稿去 AI 味儿提示词（过朱雀检测）.md": "writing",
    "小模型.md": "thinking",
    "微信读书提示词.md": "learning",
    "快速了解一个领域的提示词.md": "research",
    "思维模型.md": "thinking",
    "我个人的个人品牌视觉风格-黑金.md": "visual",
    "我的常用提示词.md": "workflow",
    "我自己的 Youmind 相关 skills 汇总.md": "workflow",
    "批评与自我批评提示词.md": "thinking",
    "抓主要矛盾的提示词.md": "thinking",
    "提示词网站.md": "workflow",
    "提问原则提示词.md": "thinking",
    "文章 2.1.md": "writing",
    "新智元标题党提示词.md": "writing",
    "李云龙技术小白提示词.md": "learning",
    "毛主席理论武器提示词.md": "thinking",
    "深度研究提示词-不限制来源.md": "research",
    "深度研究提示词.md": "research",
    "爆款推文创作提示词.md": "writing",
    "矛盾分析法提示词.md": "thinking",
    "破除知识的诅咒提示词.md": "learning",
    "第一性原理预测分析师.md": "research",
    "系统提示词.md": "workflow",
    "苏格拉底式提问提示词.md": "thinking",
    "让问题更有张力的提示词.md": "thinking",
    "读书人一定要试用的提示词-李继刚.md": "learning",
    "辩论陪练提示词系列.md": "thinking",
    "边界思维提示词.md": "thinking",
    "高桥流 slides.md": "visual",
}

EXCLUDED_FILES = {
    "主席指点迷津提示词.md",
    "毛主席理论武器提示词.md",
    "抓主要矛盾的提示词.md",
    "矛盾分析法提示词.md",
}


KEYWORD_TAGS = {
    "研究": ["研究", "分析", "预测", "领域", "洞察", "报告"],
    "写作": ["写作", "长文", "标题", "推文", "文章"],
    "阅读": ["读书", "书", "微信读书"],
    "视觉": ["视觉", "表情包", "slides", "PPT", "高斯泼溅", "主视觉"],
    "系统": ["系统", "workflow", "skill", "skills", "提示词网站"],
    "思维模型": ["思维模型", "第一性原理", "矛盾", "认知偏差", "苏格拉底", "乔哈里窗", "边界思维"],
}


def slugify(name: str) -> str:
    value = name.lower().replace(".md", "")
    value = re.sub(r"[^\w\u4e00-\u9fff]+", "-", value, flags=re.UNICODE)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "item"


def strip_markdown(text: str) -> str:
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\(([^)]+)\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
    text = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"^[>#*\-\d.\s]+", "", text, flags=re.M)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_summary(text: str, fallback_title: str) -> str:
    plain = strip_markdown(text)
    if not plain:
        return f"{fallback_title} 的原始提示词归档。"
    pieces = re.split(r"[。！？!?\n]", plain)
    pieces = [piece.strip(" |：:;；，,") for piece in pieces if piece.strip()]
    summary = "；".join(pieces[:2])[:110].strip()
    return summary or f"{fallback_title} 的原始提示词归档。"


def extract_tags(name: str, text: str) -> list[str]:
    merged = f"{name} {text}"
    tags: list[str] = []
    for tag, keywords in KEYWORD_TAGS.items():
        if any(keyword.lower() in merged.lower() for keyword in keywords):
            tags.append(tag)
    return tags[:4]


def title_from_text(name: str, text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        stripped = re.sub(r"^#+\s*", "", stripped)
        stripped = strip_markdown(stripped)
        if 2 <= len(stripped) <= 80 and "http" not in stripped.lower():
            return stripped
    return name.replace(".md", "")


def main() -> None:
    items = []
    file_names = sorted(name for name in MANUAL_CATEGORY_MAP.keys() if name not in EXCLUDED_FILES)

    def resolve_source_path(file_name: str) -> Path:
        preferred = SOURCE_DIR / file_name
        if preferred.exists():
            return preferred
        fallback = VAULT_DIR / file_name
        if fallback.exists():
            return fallback
        matches = list(VAULT_DIR.glob(f"**/{file_name}"))
        if matches:
            return matches[0]
        raise FileNotFoundError(f"Source file not found: {file_name}")

    for file_name in file_names:
        path = resolve_source_path(file_name)
        raw = path.read_text(encoding="utf-8", errors="ignore")
        title = title_from_text(file_name, raw)
        category = MANUAL_CATEGORY_MAP.get(file_name, "workflow")
        items.append(
            {
                "id": slugify(file_name),
                "filename": file_name,
                "title": title,
                "category": category,
                "summary": extract_summary(raw, title),
                "tags": extract_tags(file_name, raw),
                "content": raw.strip(),
            }
        )

    payload = {
        "meta": {
            "title": "Jackywine Prompt Library",
            "sourceDirName": SOURCE_DIR.name,
            "promptCount": len(items),
        },
        "categories": [category.__dict__ for category in CATEGORIES],
        "items": items,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        "window.PROMPT_LIBRARY_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
