"""
Regression test: every chart calculation must use Lahiri on whichever thread runs it.

pyswisseph keeps the sidereal mode PER THREAD. FastAPI runs the sync endpoints
(/natal-chart, /generate-daily-grid, ...) in a worker thread pool, while the startup
call and the async middleware only set Lahiri on the main/event-loop thread. Production
therefore served Fagan-Bradley charts (~0.88 deg off, wrong signs and dasha dates) on
most requests, while /health — which set the mode inside its own thread — reported OK.

Run: python test_lahiri_threads.py   (or pytest)
"""

import threading
from concurrent.futures import ThreadPoolExecutor

import swisseph as swe

import main

J2000 = 2451545.0
LAHIRI_J2000 = 23.857
FAGAN_BRADLEY_J2000 = 24.740


def _tropical_longitude(jd: float, planet: int) -> float:
    return swe.calc_ut(jd, planet, 0)[0][0]


def _expected_lahiri_sidereal(jd: float, planet: int) -> float:
    return (_tropical_longitude(jd, planet) - LAHIRI_J2000) % 360.0


def _in_fresh_thread(fn):
    box = {}

    def run():
        box["value"] = fn()

    t = threading.Thread(target=run)
    t.start()
    t.join()
    return box["value"]


def test_a_fresh_thread_defaults_to_fagan_bradley():
    """Documents the library behaviour the fix guards against."""
    ayan = _in_fresh_thread(lambda: swe.get_ayanamsa_ut(J2000))
    assert abs(ayan - FAGAN_BRADLEY_J2000) < 0.05, ayan


def test_planet_positions_are_lahiri_in_a_fresh_thread():
    lon = _in_fresh_thread(lambda: main.get_planet_position(J2000, swe.SUN)["longitude"])
    assert abs(lon - _expected_lahiri_sidereal(J2000, swe.SUN)) < 0.01, lon


def test_ascendant_is_lahiri_in_a_fresh_thread():
    lat, lng = 28.6139, 77.2090
    asc = _in_fresh_thread(lambda: main.get_sidereal_ascendant_longitude(J2000, lat, lng))
    _, ascmc = swe.houses(J2000, lat, lng, b"W")
    expected = (ascmc[0] - LAHIRI_J2000) % 360.0
    assert abs(asc - expected) < 0.01, asc


def test_many_pool_threads_agree_on_lahiri():
    expected = _expected_lahiri_sidereal(J2000, swe.MOON)
    with ThreadPoolExecutor(max_workers=16) as pool:
        values = list(pool.map(lambda _: main.get_planet_position(J2000, swe.MOON)["longitude"], range(64)))
    assert all(abs(v - expected) < 0.01 for v in values), sorted(set(round(v, 3) for v in values))


def test_health_checks_the_worker_path():
    body = main.health()
    assert body["ayanamsa_ok"] is True
    assert body["worker_thread_ok"] is True


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("PASS", name)
    print("all Lahiri thread tests passed")
