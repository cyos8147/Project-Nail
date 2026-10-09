"""ตัวกันกดถี่ต้องแยกลูกค้าแต่ละคนแม้ทุกคำขอจะมาจากระบบกลางของโฮสต์เดียวกัน (Render) และต้องไม่เชื่อ header ที่คนข้างนอกปลอมมา"""

import asyncio
from unittest import mock

import httpx

from app import rate_limit
from app.config import get_settings
from app.main import app


class Req:
    """request จำลองเฉพาะส่วนที่ client_ip ใช้"""

    def __init__(self, peer, headers=None):
        self.client = type("C", (), {"host": peer})() if peer else None
        self.headers = {k.lower(): v for k, v in (headers or {}).items()}


def key(peer, **headers):
    return rate_limit.client_ip(Req(peer, {k.replace("_", "-"): v for k, v in headers.items()}))


def setup_function():
    rate_limit._debug_lines_left = 0  # ไม่ต้องพิมพ์ log ตอนทดสอบ


def test_visitor_ip_comes_from_cf_connecting_ip_behind_the_platform_proxy():
    assert key("10.20.30.40", CF_Connecting_IP="203.0.113.9") == "203.0.113.9"
    assert key("10.20.30.40", CF_Connecting_IP="203.0.113.9") != key("10.20.30.40", CF_Connecting_IP="203.0.113.10")
    assert key("100.64.1.1", CF_Connecting_IP="203.0.113.7") == "203.0.113.7"  # วง carrier-grade NAT
    assert key("10.0.0.1", CF_Connecting_IP="2001:db8::1") == "2001:db8::1"


def test_without_a_trusted_header_the_direct_peer_is_used():
    assert key("10.20.30.40") == "10.20.30.40"
    assert key("10.20.30.40", X_Forwarded_For="1.2.3.4") == "10.20.30.40"  # X-Forwarded-For ปลอมง่าย ไม่เชื่อเมื่อไม่ได้ตั้งค่า
    assert key("10.0.0.1", CF_Connecting_IP="not-an-ip") == "10.0.0.1"
    assert key(None) == "127.0.0.1"


def test_a_public_peer_never_gets_to_choose_its_own_identity():
    assert key("8.8.8.8", CF_Connecting_IP="1.1.1.1", X_Forwarded_For="2.2.2.2") == "8.8.8.8"


def test_trusted_proxy_hops_reads_x_forwarded_for_from_the_right():
    with mock.patch.object(get_settings(), "trusted_proxy_hops", 2):
        assert key("10.0.0.1", X_Forwarded_For="6.6.6.6, 203.0.113.50, 172.70.1.1") == "203.0.113.50"  # ค่าปลอมทางซ้ายถูกมองข้าม
        assert key("10.0.0.1", X_Forwarded_For="203.0.113.50") == "10.0.0.1"  # สายสั้นกว่าที่คาด -> ถอยไปใช้ peer


def test_end_to_end_eight_visitors_behind_one_proxy_are_not_blocked_together(client):
    """ยิงผ่านแอปจริง โดยให้ทุกคำขอมาจากเครื่องภายในเครื่องเดียว (10.1.2.3) เหมือนระบบกลางของ Render"""

    async def scenario():
        transport = httpx.ASGITransport(app=app, client=("10.1.2.3", 50000))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as proxy:
            async def attempt(visitor, password="wrong"):
                r = await proxy.post("/api/admin/login", headers={"CF-Connecting-IP": visitor}, json={"username": "owner", "password": password})
                return r.status_code

            eight_visitors = [await attempt(f"203.0.113.{n}") for n in range(1, 9)]
            one_hammering = [await attempt("198.51.100.77") for _ in range(7)]
            another_visitor_can_still_log_in = await attempt("203.0.113.200", "test-admin-pass-123")
            return eight_visitors, one_hammering, another_visitor_can_still_log_in

    eight, hammer, other = asyncio.run(scenario())
    assert eight == [401] * 8
    assert hammer == [401] * 5 + [429] * 2
    assert other == 200
