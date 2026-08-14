"""เทรนโมเดล XGBoost สำหรับแนะนำสี/ลวดลายเล็บ (ข้อ 9.2 ในเอกสารโครงงาน)

Feature: สีผิว, รูปทรงเล็บ, ความยาวเล็บ, สไตล์ที่ต้องการ, ประเภทของโอกาส (ทั้งหมด categorical)
Label:   ลวดลายเล็บที่แนะนำ (multiclass — 1 คลาสต่อ 1 ลายในแคตตาล็อก)
ตัวชี้วัด: Accuracy, Precision, Recall, F1-score (ตามที่ระบุในเอกสารโครงงาน หัวข้อ 1.3)

วิธีรัน:
    cd backend
    python -m ml.generate_recommendation_dataset      # สร้าง/อัปเดตชุดข้อมูลก่อน (ถ้ายังไม่มี)
    python -m ml.train_xgboost_recommender

ผลลัพธ์:
    backend/ml/models/nail_recommender.json              โมเดลที่เทรนแล้ว (native XGBoost format)
    backend/ml/models/nail_recommender_encoders.json      ตัวแปลง category <-> id ที่ใช้ตอน inference
                                                           (เก็บเป็น JSON ธรรมดา ไม่ใช้ pickle/joblib
                                                           เพื่อไม่ให้ผูกกับเวอร์ชัน scikit-learn ตอนโหลด)
    backend/ml/models/nail_recommender_metrics.json       ผลประเมินโมเดล (โชว์ในหน้า Admin Dashboard ได้)
"""

import json
import sys
from pathlib import Path

import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent))

FEATURE_COLUMNS = ["skin_tone", "nail_shape", "nail_length", "style_preference", "occasion"]
LABEL_COLUMN = "recommended_design"


def main():
    dataset_path = ROOT / "datasets" / "nail_recommendation_dataset.csv"
    if not dataset_path.exists():
        from generate_recommendation_dataset import generate

        df = generate()
        dataset_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(dataset_path, index=False)
    else:
        df = pd.read_csv(dataset_path)

    feature_encoder = OrdinalEncoder()
    X = feature_encoder.fit_transform(df[FEATURE_COLUMNS])

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df[LABEL_COLUMN])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=len(label_encoder.classes_),
        eval_metric="mlogloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision_macro": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "n_classes": len(label_encoder.classes_),
    }
    print("ผลประเมินโมเดล:", json.dumps(metrics, ensure_ascii=False, indent=2))

    models_dir = ROOT / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    model.save_model(models_dir / "nail_recommender.json")

    encoders = {
        "feature_columns": FEATURE_COLUMNS,
        # ลำดับใน categories_[i] คือลำดับ index ที่ OrdinalEncoder แปลงให้ (index ตามลำดับ sort ปกติ)
        "feature_categories": {
            col: categories.tolist() for col, categories in zip(FEATURE_COLUMNS, feature_encoder.categories_)
        },
        "label_classes": label_encoder.classes_.tolist(),
    }
    with open(models_dir / "nail_recommender_encoders.json", "w", encoding="utf-8") as f:
        json.dump(encoders, f, ensure_ascii=False, indent=2)

    with open(models_dir / "nail_recommender_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print(f"บันทึกโมเดลไปที่ {models_dir}")


if __name__ == "__main__":
    main()
