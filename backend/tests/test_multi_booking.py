"""จองหลายบริการต่อกันในครั้งเดียว (ข้อ 2.2) -- ทำต่อทีละอย่าง บริการถัดไปเริ่มเมื่อบริการก่อนหน้าเสร็จ"""

from sqlalchemy import Column, Date, Integer, MetaData, String, Table, create_engine, inspect

from conftest import book, closed_tuesday, open_date


def _item(service, **extra):
    return {"category_id": service["category_id"], "service_id": service["id"], **extra}


def _multi(client, items, day, time, phone, name="ลูกค้าหลายบริการ"):
    return client.post(
        "/api/bookings/multi",
        json={
            "items": items,
            "booking_date": day.isoformat(),
            "booking_time": time,
            "customer_name": name,
            "customer_phone": phone,
            "line_id": "multi_test",
        },
    )


def _chain(client, day, items):
    return client.get("/api/availability/chain", params={"date": day.isoformat(), "items": items}).json()


def test_two_services_are_booked_back_to_back_in_one_group(client, services, owner_headers, phone):
    day = open_date(150)
    r = _multi(
        client,
        [_item(services["ตัดผม"]), _item(services["ทำสีเจล"], shade_id="ai-D23B4E", shade_name="แดงเชอร์รี่")],
        day, "10:00", phone,
    )
    assert r.status_code == 201, r.text
    hair, nail = r.json()
    assert (hair["booking_time"], hair["estimated_duration_minutes"]) == ("10:00", 60)
    assert (nail["booking_time"], nail["estimated_duration_minutes"]) == ("11:00", 60)  # เริ่มตอนตัดผมเสร็จ
    assert hair["group_id"] and hair["group_id"] == nail["group_id"]
    assert hair["booking_code"] != nail["booking_code"]
    assert (hair["shade_name"], nail["shade_name"]) == (None, "แดงเชอร์รี่")
    assert hair["status"] == nail["status"] == "pending"

    # แอดมินเห็นทั้งสองคิวพร้อม group_id เดียวกัน
    listed = client.get("/api/admin/bookings", headers=owner_headers, params={"search": phone}).json()
    assert {b["group_id"] for b in listed} == {hair["group_id"]}
    # คิวเดี่ยวไม่มี group_id
    single = book(client, services["ตัดผม"], day, "15:00", phone + "1").json()
    assert single["group_id"] is None


def test_a_start_time_is_free_only_when_every_service_in_the_chain_is_free(client, services, phone):
    day = open_date(151)
    # ช่างทำเล็บไม่ว่าง 11:00–12:00 → เริ่มตัดผม 10:00 แล้วต่อเล็บ 11:00 ไม่ได้ แต่ตัดผมอย่างเดียว 10:00 ยังว่าง
    assert book(client, services["ทำสีเจล"], day, "11:00", phone + "9").status_code == 201
    slots = {s["time"]: s["available"] for s in _chain(client, day, "hair:60,nail:60")["slots"]}
    assert slots["10:00"] is False
    assert slots["12:00"] is True
    hair_only = {s["time"]: s["available"] for s in _chain(client, day, "hair:60")["slots"]}
    assert hair_only["10:00"] is True

    r = _multi(client, [_item(services["ตัดผม"]), _item(services["ทำสีเจล"])], day, "10:00", phone)
    assert r.status_code == 409
    # ไม่มีอะไรค้างครึ่งชุด: ตัดผม 10:00 ยังจองให้คนอื่นได้
    assert book(client, services["ตัดผม"], day, "10:00", phone + "8").status_code == 201


def test_the_whole_chain_must_finish_before_closing(client, services):
    day = open_date(152)
    slots = _chain(client, day, "hair:180,nail:90")["slots"]  # รวม 4 ชม. 30 นาที ร้านปิด 19:00
    assert slots and slots[-1]["time"] <= "14:30"
    assert _chain(client, closed_tuesday(160), "hair:60,nail:60")["slots"] == []


def test_order_follows_the_customer_choice(client, services, phone):
    day = open_date(153)
    r = _multi(client, [_item(services["เพ้นท์ลาย"]), _item(services["สระ + ไดร์"])], day, "13:00", phone)
    assert r.status_code == 201
    nail, hair = r.json()
    assert (nail["service_name"], nail["booking_time"]) == ("เพ้นท์ลาย", "13:00")
    assert (hair["service_name"], hair["booking_time"]) == ("สระ + ไดร์", "13:45")


def test_bad_requests_are_refused(client, services, phone):
    day = open_date(154)
    hair = _item(services["ตัดผม"])
    assert _multi(client, [hair], day, "10:00", phone).status_code == 422  # ต้องมีอย่างน้อย 2 บริการ
    assert _multi(client, [hair, hair], day, "10:00", phone).status_code == 400  # บริการซ้ำ
    wrong_category = {"category_id": "nail", "service_id": services["ตัดผม"]["id"]}
    assert _multi(client, [hair, wrong_category], day, "10:00", phone).status_code == 404
    assert _multi(client, [hair, _item(services["ทำสีเจล"])], closed_tuesday(161), "10:00", phone).status_code == 400
    four = [_item(services[n]) for n in ("ตัดผม", "ทำสีเจล", "เพ้นท์ลาย", "สระ + ไดร์")]
    assert _multi(client, four, day, "10:00", phone).status_code == 422
    assert client.get("/api/availability/chain", params={"date": day.isoformat(), "items": "hair:abc"}).status_code == 422


def test_each_service_can_still_be_cancelled_on_its_own(client, services, phone):
    day = open_date(155)
    hair, nail = _multi(client, [_item(services["ตัดผม"]), _item(services["ทำสีเจล"])], day, "10:00", phone).json()
    assert client.patch(f"/api/bookings/{hair['id']}/cancel", params={"phone": phone}).json()["status"] == "cancelled"
    assert client.get("/api/bookings/status", params={"booking_code": nail["booking_code"], "phone": phone}).json()["status"] == "pending"
    assert book(client, services["ตัดผม"], day, "10:00", phone + "7").status_code == 201


def test_migration_adds_group_id_to_an_existing_bookings_table(tmp_path):
    from app.migrations import ensure_columns

    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    meta = MetaData()
    Table("bookings", meta, Column("id", String(36), primary_key=True), Column("booking_date", Date), Column("n", Integer))
    meta.create_all(engine)
    added = ensure_columns(engine)
    assert "bookings.group_id" in added
    assert "group_id" in {c["name"] for c in inspect(engine).get_columns("bookings")}
    assert ensure_columns(engine) == []  # รันซ้ำไม่ทำอะไร
