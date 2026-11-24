"""หน้ารายงานรายได้ (ส่วนที่ 5): ยอดรวมตรงกับรายการคิว ช่วงวันที่ การแยกกลุ่ม และไฟล์ CSV"""

from datetime import date
from unittest import mock

import pytest

from conftest import book

TODAY = date(2047, 4, 15)


@pytest.fixture(scope="module")
def report_data(client, services, owner_headers):
    """คิวเสร็จ 3 รายการในเดือนเดียวกัน (ราคาตั้งต่างกัน) + ค่าใช้จ่าย 1 รายการ"""
    rows = []
    specs = [
        ("2047-04-01", "10:00", "ทำสีเจล", 350, None),
        ("2047-04-03", "11:00", "ตัดผม", 350, 300),  # รับจริงน้อยกว่าราคาตั้ง
        ("2047-03-20", "13:00", "ทำสีเจล", 350, 400),  # เดือนก่อน รับจริงเกินราคาตั้ง
    ]
    for i, (day, time, service_name, _price, paid) in enumerate(specs):
        svc = services[service_name]
        b = book(client, svc, date.fromisoformat(day), time, f"0899900{i}").json()
        client.patch(f"/api/admin/bookings/{b['id']}", headers=owner_headers, json={"status": "completed"})
        if paid is not None:
            client.patch(f"/api/admin/bookings/{b['id']}/paid", headers=owner_headers, json={"paid_amount": paid})
        rows.append(b)
    client.post("/api/admin/expenses", headers=owner_headers, json={"expense_date": "2047-04-03", "category": "วัสดุ", "amount": 100, "note": "ทดสอบ"})
    return rows


def _report(client, headers, **params):
    with mock.patch("app.routers.admin_reports.today_th", lambda: TODAY):
        return client.get("/api/admin/reports/revenue", headers=headers, params=params)


def test_totals_use_actual_amount_when_entered_and_list_price_otherwise(client, owner_headers, report_data):
    r = _report(client, owner_headers, date_from="2047-04-01", date_to="2047-04-30").json()
    t = r["totals"]
    assert t["count"] == 2
    assert t["list_price"] == 700  # ราคาตั้งรวม
    assert t["revenue"] == 650  # 350 (ไม่กรอก) + 300 (กรอกแล้ว)
    assert t["adjusted"] == -50  # ส่วนต่างจากราคาตั้ง
    assert t["expenses"] == 100
    assert t["profit"] == 550
    assert r["group"] == "day"
    assert [g["revenue"] for g in r["groups"]] == [350, 300]  # 1 เม.ย. และ 3 เม.ย.


def test_range_is_respected_and_the_previous_month_is_excluded(client, owner_headers, report_data):
    r = _report(client, owner_headers, date_from="2047-03-01", date_to="2047-03-31").json()
    assert r["totals"]["count"] == 1 and r["totals"]["revenue"] == 400
    assert r["totals"]["expenses"] == 0


def test_monthly_and_yearly_grouping(client, owner_headers, report_data):
    monthly = _report(client, owner_headers, date_from="2047-03-01", date_to="2047-04-30", group="month").json()
    assert [g["key"] for g in monthly["groups"]] == ["2047-03", "2047-04"]
    assert [g["revenue"] for g in monthly["groups"]] == [400, 650]
    assert monthly["groups"][1]["expenses"] == 100
    yearly = _report(client, owner_headers, date_from="2046-01-01", date_to="2047-12-31", group="year").json()
    assert [g["key"] for g in yearly["groups"]] == ["2047"]
    assert yearly["groups"][0]["label"] == "ปี 2590"  # พ.ศ.


def test_only_completed_bookings_count_and_the_list_is_returned(client, services, owner_headers, phone):
    open_booking = book(client, services["ตัดผม"], date(2047, 4, 20), "10:00", phone + "x").json()
    r = _report(client, owner_headers, date_from="2047-04-20", date_to="2047-04-20").json()
    assert r["totals"]["count"] == 0 and r["bookings"] == []
    assert open_booking["status"] == "pending"


def test_bad_ranges_are_refused(client, owner_headers):
    assert _report(client, owner_headers, date_from="2047-05-02", date_to="2047-05-01").status_code == 422
    assert _report(client, owner_headers, date_from="2040-01-01", date_to="2047-05-01").status_code == 422
    assert client.get("/api/admin/reports/revenue").status_code in (401, 403)


def test_csv_has_totals_and_the_actual_amount_column(client, owner_headers, report_data):
    r = client.get("/api/admin/reports/revenue.csv", headers=owner_headers, params={"date_from": "2047-04-01", "date_to": "2047-04-30"})
    assert r.status_code == 200 and "text/csv" in r.headers["content-type"]
    lines = r.text.lstrip("﻿").splitlines()
    assert lines[0].split(",")[-1] == "รายได้ที่นับ (บาท)"
    assert lines[-1].startswith("รวม")
    assert float(lines[-1].split(",")[-1]) == 650
