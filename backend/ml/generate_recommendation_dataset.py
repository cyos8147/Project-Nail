"""สร้างชุดข้อมูลฝึกสำหรับโมเดล XGBoost แนะนำสี/ลวดลายเล็บ

เหตุผลที่ต้อง "สร้าง" ชุดข้อมูลแทนที่จะมีให้พร้อมใช้:
ระบบยังไม่มีผู้ใช้งานจริงมาก่อน (cold start) จึงยังไม่มีประวัติ "ลูกค้าแบบไหนเลือกลายไหน" ให้เทรน
สคริปต์นี้จึงสร้างชุดข้อมูลสังเคราะห์ (synthetic) จากกฎที่อิงหลักการจริงของช่างทำเล็บ
(โทนผิว/สไตล์ที่ชอบ/โอกาสที่ใช้ ควรแมทช์กับคุณสมบัติของลายแบบไหน) ผสม label noise ~10%
เพื่อจำลองความหลากหลายของรสนิยมจริง ทำให้โมเดลที่เทรนออกมาไม่ overfit จนตอบตายตัวเกินไป

เมื่อระบบใช้งานจริงแล้ว ตาราง ai_recommend_log (มีคอลัมน์ accepted ว่าลูกค้ากด "จองลายนี้" ตามที่แนะนำ
หรือไม่) จะกลายเป็นข้อมูลจริงที่ควรผสมเข้ามาแทนที่ข้อมูลสังเคราะห์ทีละน้อย — ดู docs/04_AI_TRAINING.md
"""

import random
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.seed import NAIL_DESIGNS  # noqa: E402

SKIN_TONES = ["warm", "cool", "neutral"]
NAIL_SHAPES = ["round", "oval", "square", "squoval", "almond", "coffin", "stiletto"]
NAIL_LENGTHS = ["short", "medium", "long"]
STYLE_PREFS = ["minimal", "classic", "bold"]
OCCASIONS = ["daily", "work", "wedding", "party", "date"]

# โอกาสแต่ละแบบมักไปด้วยกันกับความซับซ้อนของลายแบบไหน (ใช้ประกอบการให้คะแนน ไม่ใช่กฎตายตัว)
OCCASION_COMPLEXITY_BONUS = {
    "daily": {"simple": 12, "medium": 0, "complex": -10},
    "work": {"simple": 10, "medium": 2, "complex": -14},
    "wedding": {"simple": -6, "medium": 6, "complex": 14},
    "party": {"simple": -8, "medium": 4, "complex": 16},
    "date": {"simple": 2, "medium": 8, "complex": 4},
}

# ความยาวเล็บที่ต่างกันเหมาะกับลายบางสไตล์มากกว่า (เล็บยาวโชว์ลายซับซ้อน/ปลายแหลมได้ดีกว่า)
LENGTH_COMPLEXITY_BONUS = {
    "short": {"simple": 8, "medium": 0, "complex": -8},
    "medium": {"simple": 0, "medium": 4, "complex": 2},
    "long": {"simple": -6, "medium": 2, "complex": 10},
}


def score_design(design: dict, skin_tone: str, style_pref: str, occasion: str, nail_length: str) -> float:
    tone_score = design["tone_fit"].get(skin_tone, 50)
    style_bonus = 20 if design["style_tag"] == style_pref else 0
    occasion_bonus = OCCASION_COMPLEXITY_BONUS[occasion][design["complexity"]]
    length_bonus = LENGTH_COMPLEXITY_BONUS[nail_length][design["complexity"]]
    popularity_bonus = design["popularity"] * 0.15
    return tone_score * 0.5 + style_bonus + occasion_bonus + length_bonus + popularity_bonus


def generate(n_rows: int = 6000, noise_ratio: float = 0.1, seed: int = 42) -> pd.DataFrame:
    rng = random.Random(seed)
    rows = []
    for _ in range(n_rows):
        skin_tone = rng.choice(SKIN_TONES)
        nail_shape = rng.choice(NAIL_SHAPES)
        nail_length = rng.choice(NAIL_LENGTHS)
        style_pref = rng.choice(STYLE_PREFS)
        occasion = rng.choice(OCCASIONS)

        scored = [
            (score_design(d, skin_tone, style_pref, occasion, nail_length), d["name"])
            for d in NAIL_DESIGNS
        ]
        scored.sort(key=lambda x: x[0], reverse=True)
        label = scored[0][1]

        # label noise: 10% ของแถวสุ่มเลือกจาก top-3 แทน top-1 เพื่อจำลองรสนิยมส่วนบุคคลที่ไม่ตายตัว
        if rng.random() < noise_ratio:
            label = rng.choice([s[1] for s in scored[:3]])

        rows.append(
            {
                "skin_tone": skin_tone,
                "nail_shape": nail_shape,
                "nail_length": nail_length,
                "style_preference": style_pref,
                "occasion": occasion,
                "recommended_design": label,
            }
        )
    return pd.DataFrame(rows)


if __name__ == "__main__":
    out_path = Path(__file__).resolve().parent / "datasets" / "nail_recommendation_dataset.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df = generate()
    df.to_csv(out_path, index=False)
    print(f"เขียนชุดข้อมูล {len(df)} แถว ไปที่ {out_path}")
    print(df["recommended_design"].value_counts())
