"""แปลงโมเดล YOLOv8-Seg (.pt) เป็น ONNX สำหรับใช้บนเซิร์ฟเวอร์ (app/ai/nail_onnx.py รันด้วย onnxruntime)

ต้องรันทุกครั้งหลังเทรนโมเดลใหม่ -- เซิร์ฟเวอร์ใช้ไฟล์ .onnx ไม่ใช่ .pt (ไม่ได้ลง ultralytics/PyTorch
บนเซิร์ฟเวอร์เพราะกินแรมเกิน 512MB ของ Render ฟรี)

วิธีรัน (ในเครื่องตัวเอง ต้องลง ultralytics ก่อน):
    pip install ultralytics onnx
    cd backend
    python -m ml.export_onnx
    # หรือระบุไฟล์ที่เพิ่งเทรนเสร็จ: python -m ml.export_onnx --weights runs/segment/train/weights/best.pt

ได้ไฟล์ ml/models/yolov8_nail_seg.onnx (วางทับของเดิม) แล้ว commit + push ขึ้นไปตามปกติ
"""

import argparse
import shutil
from pathlib import Path

DEST = Path("ml/models/yolov8_nail_seg.onnx")


def main():
    parser = argparse.ArgumentParser(description="แปลง YOLOv8-Seg .pt เป็น .onnx")
    parser.add_argument("--weights", default="ml/models/yolov8_nail_seg.pt")
    args = parser.parse_args()

    from ultralytics import YOLO

    # imgsz/opset ต้องตรงกับที่ nail_onnx.py คาดไว้ (input 1x3x640x640, ไม่ dynamic)
    # ultralytics เขียนไฟล์ .onnx ไว้ข้างๆ ไฟล์ .pt เสมอ จึงย้ายไปที่ปลายทางที่เซิร์ฟเวอร์ใช้ถ้าคนละที่
    exported = Path(YOLO(args.weights).export(format="onnx", imgsz=640, opset=12, simplify=False, dynamic=False))
    if exported.resolve() != DEST.resolve():
        shutil.move(exported, DEST)
    print(f"บันทึกโมเดล ONNX ไว้ที่ {DEST}")


if __name__ == "__main__":
    main()
