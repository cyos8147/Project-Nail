"""เทรน/ไฟน์จูน YOLOv8-Seg สำหรับแยกบริเวณเล็บออกจากภาพมือ (Nail Segmentation)

Pipeline ของระบบตอนนี้ (app/ai/segmentation.py) ใช้ MediaPipe Hands + OpenCV region-growing เป็นค่า
เริ่มต้นอยู่แล้ว ใช้งานได้ทันทีไม่ต้องเทรนอะไรเพิ่ม — สคริปต์นี้สำหรับตอนที่ต้องการความแม่นยำสูงขึ้น
ตามที่ระบุไว้ในเอกสารโครงงาน (โมเดล YOLOv8-Seg, ตัวชี้วัด IoU/Precision/Recall/mAP) โดยเทรนบนชุดข้อมูล
ภาพมือจริงที่มี segmentation mask ของเล็บกำกับไว้

ขั้นตอนเตรียมชุดข้อมูล (ดูรายละเอียดเต็มใน docs/04_AI_TRAINING.md):
  1. เก็บภาพมือ (มือแบบต่างๆ, พื้นหลังต่างกัน, มีเล็บทาสี/ไม่ทาสี) อย่างน้อย ~500-1000 ภาพ
     หรือใช้ชุดข้อมูลสาธารณะบน Roboflow Universe (ค้นหา "nail segmentation") เป็นจุดเริ่มต้น
  2. Label ขอบเขตเล็บแต่ละนิ้วด้วย polygon (แนะนำ Roboflow / CVAT / Label Studio)
  3. Export เป็นฟอร์แมต "YOLOv8 (segmentation)" -> จะได้โฟลเดอร์ที่มี data.yaml + images/ + labels/
     แบ่งเป็น train/valid/test ตามสัดส่วน 70/20/10 (ตามที่ระบุไว้ในเอกสารโครงงาน)
  4. วางโฟลเดอร์ที่ export ได้ไว้ที่ backend/ml/datasets/nail_seg/ (มี data.yaml อยู่ข้างใน)

วิธีรัน:
    pip install ultralytics   # ติดตั้งแยก (หนัก มี torch) เฉพาะตอนจะเทรนจริงเท่านั้น
    cd backend
    python -m ml.train_yolo_seg --data ml/datasets/nail_seg/data.yaml --epochs 100

ผลลัพธ์: น้ำหนักโมเดลที่เทรนเสร็จจะอยู่ที่ runs/segment/train/weights/best.pt
ให้คัดลอกไฟล์นั้นไปไว้ที่ backend/ml/models/yolov8_nail_seg.pt (ตาม YOLO_NAIL_SEG_WEIGHTS ใน .env)
ระบบ (app/ai/segmentation.py) จะตรวจพบไฟล์นี้และสลับไปใช้ YOLOv8-Seg แทน MediaPipe+OpenCV โดยอัตโนมัติ
"""

import argparse


def main():
    parser = argparse.ArgumentParser(description="เทรน YOLOv8-Seg สำหรับ nail segmentation")
    parser.add_argument("--data", default="ml/datasets/nail_seg/data.yaml", help="path ไปยัง data.yaml")
    parser.add_argument("--model", default="yolov8n-seg.pt", help="โมเดลตั้งต้น (pretrained บน COCO)")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=640)
    args = parser.parse_args()

    from ultralytics import YOLO  # import ตรงนี้เพื่อไม่บังคับให้ลง ultralytics ถ้าแค่รันเซิร์ฟเวอร์เฉยๆ

    model = YOLO(args.model)
    results = model.train(data=args.data, epochs=args.epochs, imgsz=args.imgsz, task="segment")

    metrics = model.val()
    print("=== ผลประเมินโมเดล (validation set) ===")
    print(f"mAP50-95 (mask): {metrics.seg.map:.4f}")
    print(f"mAP50 (mask):    {metrics.seg.map50:.4f}")
    print(f"Precision:       {metrics.seg.mp:.4f}")
    print(f"Recall:          {metrics.seg.mr:.4f}")
    print("\nน้ำหนักโมเดลที่ดีที่สุดถูกบันทึกไว้ใน runs/segment/train/weights/best.pt")
    print("คัดลอกไปไว้ที่ backend/ml/models/yolov8_nail_seg.pt เพื่อให้ backend เริ่มใช้งานโมเดลนี้")


if __name__ == "__main__":
    main()
