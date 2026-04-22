from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
import swisseph as swe
import math
import traceback

app = FastAPI(title="Vedic Astrology Ephemeris Service")

# Set Lahiri ayanamsa using ICRC J2000.0 standard (23°51'20" at J2000.0)
# This pins the zero-point to the Indian Nautical Almanac standard, matching
# Jagannatha Hora and government ephemeris. Without this, pyswisseph uses a
# slightly different default that can shift boundary planets by up to 0.3°.
swe.set_sid_mode(swe.SIDM_LAHIRI, 2451545.0, 23.853222)
print(f"[ephemeris] Lahiri ayanamsa at J2000.0: {swe.get_ayanamsa_ut(2451545.0):.6f}° (ICRC standard)")

# Timezone finder instance
_tf = TimezoneFinder()

# Zodiac signs
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
         "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# Nakshatras (27 lunar mansions)
NAKSHATRAS = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

# Vimshottari Dasha periods (in years)
DASHA_YEARS = {
    "Ketu": 7, "Venus": 20, "Sun": 6, "Moon": 10, "Mars": 7,
    "Rahu": 18, "Jupiter": 16, "Saturn": 19, "Mercury": 17
}

# Dasha sequence starting from each nakshatra
DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

# Hora rulers (Chaldean order)
HORA_RULERS = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"]

# Day rulers
DAY_RULERS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]

# Rahu Kaal parts (1-indexed)
RAHU_KAAL_PARTS = {
    0: 8,  # Sunday
    1: 2,  # Monday
    2: 7,  # Tuesday
    3: 5,  # Wednesday
    4: 6,  # Thursday
    5: 4,  # Friday
    6: 3   # Saturday
}

# Choghadiya sequences for each day
CHOGHADIYA_DAY = {
    0: ["Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"],
    1: ["Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit"],
    2: ["Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog"],
    3: ["Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh"],
    4: ["Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal", "Shubh"],
    5: ["Chal", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Chal"],
    6: ["Kaal", "Shubh", "Rog", "Udveg", "Chal", "Labh", "Amrit", "Kaal"]
}

# Quality mapping
CHOGHADIYA_QUALITY = {
    "Amrit": "Excellent", "Shubh": "Good", "Labh": "Good", "Chal": "Neutral",
    "Rog": "Inauspicious", "Kaal": "Inauspicious", "Udveg": "Inauspicious"
}

# Pydantic models
class NatalChartInput(BaseModel):
    birth_date: str
    birth_time: str
    birth_city: str
    birth_lat: float
    birth_lng: float

class PanchangInput(BaseModel):
    date: str
    lat: float
    lng: float
    timezone_offset: float

class HoraScheduleInput(BaseModel):
    date: str
    lat: float
    lng: float
    timezone_offset: float

class ChoghadiyaInput(BaseModel):
    date: str
    lat: float
    lng: float
    timezone_offset: float

class RahuKaalInput(BaseModel):
    date: str
    lat: float
    lng: float
    timezone_offset: float

class FullDayDataInput(BaseModel):
    date: str
    birth_lat: float
    birth_lng: float
    current_lat: float
    current_lng: float
    timezone_offset: float


def get_julian_day(dt: datetime) -> float:
    """Convert datetime to Julian Day"""
    return swe.julday(dt.year, dt.month, dt.day, 
                      dt.hour + dt.minute/60.0 + dt.second/3600.0)


def get_planet_position(jd: float, planet: int) -> Dict[str, Any]:
    """Get sidereal position of a planet"""
    result = swe.calc_ut(jd, planet, swe.FLG_SIDEREAL)
    longitude = result[0][0]
    speed = result[0][3]
    
    sign_num = int(longitude / 30)
    degree = longitude % 30
    
    # Nakshatra calculation
    nakshatra_num = int(longitude / (360/27))
    nakshatra_pada = int((longitude % (360/27)) / (360/27/4)) + 1
    
    return {
        "longitude": longitude,
        "sign": SIGNS[sign_num],
        "degree": round(degree, 4),
        "nakshatra": NAKSHATRAS[nakshatra_num],
        "nakshatra_pada": nakshatra_pada,
        "is_retrograde": speed < 0,
        "nakshatra_num": nakshatra_num
    }


def local_to_utc(birth_date: str, birth_time: str, lat: float, lng: float) -> datetime:
    """Convert local birth time to UTC using lat/lng for timezone detection"""
    tz_name = _tf.timezone_at(lat=lat, lng=lng)
    local_tz = ZoneInfo(tz_name)
    local_dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M:%S")
    local_dt = local_dt.replace(tzinfo=local_tz)
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    return utc_dt.replace(tzinfo=None)


def get_sidereal_ascendant_longitude(jd: float, lat: float, lng: float) -> float:
    """
    Sidereal ascendant longitude (0–360°) at UT jd for lat/lng.
    Uses Swiss Ephemeris whole-sign house flag ``W`` for ascendant computation only
    (no Placidus house sectors anywhere).
    """
    try:
        _, ascmc = swe.houses(jd, lat, lng, b'W')
    except Exception:
        _, ascmc = swe.houses(jd, lat, lng, b'E')
    asc_tropical = float(ascmc[0]) % 360.0
    return (asc_tropical - swe.get_ayanamsa_ut(jd)) % 360.0


def get_whole_sign_house(planet_longitude: float, lagna_longitude: float) -> int:
    """
    Whole-sign house system (Parashari/Vedic standard).
    The sign containing the lagna = House 1, next sign = House 2, etc.
    Planet's exact degree doesn't matter — only its sign.
    """
    planet_sign = int(planet_longitude / 30) % 12  # 0=Aries ... 11=Pisces
    lagna_sign = int(lagna_longitude / 30) % 12
    return ((planet_sign - lagna_sign + 12) % 12) + 1


def calculate_vimshottari_dasha(moon_longitude: float, birth_moment_utc: datetime) -> List[Dict]:
    """Calculate Vimshottari Dasha sequence using Moon's sidereal longitude and the birth instant (UTC)."""
    NAK_SPAN = 360.0 / 27  # 13°20' per nakshatra

    nakshatra_num = int(moon_longitude / NAK_SPAN)
    fraction_elapsed = (moon_longitude % NAK_SPAN) / NAK_SPAN

    start_planet_idx = nakshatra_num % 9
    first_planet = DASHA_SEQUENCE[start_planet_idx]

    # First dasha began before birth; anchor balance to the actual birth instant (UTC)
    first_dasha_start = birth_moment_utc - timedelta(days=fraction_elapsed * DASHA_YEARS[first_planet] * 365.25)

    dasha_list = []
    current_date = first_dasha_start

    for i in range(9):
        planet_idx = (start_planet_idx + i) % 9
        planet = DASHA_SEQUENCE[planet_idx]
        years = DASHA_YEARS[planet]
        end_date = current_date + timedelta(days=years * 365.25)
        
        # Calculate antardashas
        antardashas = []
        antardasha_start = current_date
        for j in range(9):
            antardasha_planet_idx = (planet_idx + j) % 9
            antardasha_planet = DASHA_SEQUENCE[antardasha_planet_idx]
            antardasha_years = DASHA_YEARS[antardasha_planet]
            antardasha_duration = (years * antardasha_years) / 120.0
            antardasha_end = antardasha_start + timedelta(days=antardasha_duration * 365.25)
            
            antardashas.append({
                "planet": antardasha_planet,
                "start_date": antardasha_start.strftime("%Y-%m-%d"),
                "end_date": antardasha_end.strftime("%Y-%m-%d")
            })
            antardasha_start = antardasha_end
        
        dasha_list.append({
            "planet": planet,
            "start_date": current_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "antardasha": antardashas
        })
        current_date = end_date
    
    return dasha_list


def get_current_dasha(dasha_sequence: List[Dict], current_date: datetime) -> Dict:
    """Find current Mahadasha and Antardasha"""
    current_date_str = current_date.strftime("%Y-%m-%d")
    
    for dasha in dasha_sequence:
        if dasha["start_date"] <= current_date_str <= dasha["end_date"]:
            for antardasha in dasha["antardasha"]:
                if antardasha["start_date"] <= current_date_str <= antardasha["end_date"]:
                    return {
                        "mahadasha": dasha["planet"],
                        "antardasha": antardasha["planet"],
                        "start_date": antardasha["start_date"],
                        "end_date": antardasha["end_date"]
                    }
    return {}


def get_sunrise_sunset(jd: float, lat: float, lng: float) -> tuple:
    """Calculate sunrise and sunset times"""
    # swe.rise_trans(tjdut, body, rsmi, geopos, atpress, attemp)
    geopos = (lng, lat, 0.0)
    sunrise_jd = swe.rise_trans(jd - 0.5, swe.SUN, swe.CALC_RISE | swe.BIT_DISC_CENTER, geopos, 0.0, 0.0)[1][0]
    sunset_jd = swe.rise_trans(jd - 0.5, swe.SUN, swe.CALC_SET | swe.BIT_DISC_CENTER, geopos, 0.0, 0.0)[1][0]
    return sunrise_jd, sunset_jd


def jd_to_time_string(jd: float, timezone_offset: float) -> str:
    """Convert Julian Day to time string. timezone_offset is in minutes from UTC."""
    dt = swe.revjul(jd)
    offset_hours = timezone_offset / 60.0 if abs(timezone_offset) > 24 else timezone_offset
    time_dt = datetime(int(dt[0]), int(dt[1]), int(dt[2]), 0, 0, 0) + timedelta(days=dt[3]) + timedelta(hours=offset_hours)
    return time_dt.strftime("%H:%M:%S")


def calculate_tithi(sun_long: float, moon_long: float) -> str:
    """Calculate Tithi (lunar day)"""
    diff = (moon_long - sun_long) % 360
    tithi_num = int(diff / 12) + 1
    
    tithis = [
        "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
        "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
        "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"
    ]
    
    paksha = "Shukla" if diff < 180 else "Krishna"
    tithi_name = tithis[min(tithi_num - 1, 14)]
    
    if tithi_num == 15 and paksha == "Shukla":
        return "Purnima (Full Moon)"
    elif tithi_num == 15 and paksha == "Krishna":
        return "Amavasya (New Moon)"
    else:
        return f"{paksha} {tithi_name}"


def calculate_yoga(sun_long: float, moon_long: float) -> str:
    """Calculate Yoga"""
    yogas = [
        "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
        "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva",
        "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan",
        "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
        "Brahma", "Indra", "Vaidhriti"
    ]
    
    total = (sun_long + moon_long) % 360
    yoga_num = int(total / (360/27))
    return yogas[yoga_num]


def calculate_karana(sun_long: float, moon_long: float) -> str:
    """Calculate Karana"""
    karanas = [
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
        "Shakuni", "Chatushpada", "Naga", "Kimstughna"
    ]
    
    diff = (moon_long - sun_long) % 360
    karana_num = int(diff / 6)
    return karanas[min(karana_num, 59)]


@app.get("/")
def read_root():
    return {"message": "Vedic Astrology Ephemeris Service", "version": "1.0"}


@app.post("/natal-chart")
def natal_chart(data: NatalChartInput):
    try:
        # Convert local birth time to UTC using birth coordinates, then get Julian Day
        birth_utc = local_to_utc(data.birth_date, data.birth_time, data.birth_lat, data.birth_lng)
        jd = get_julian_day(birth_utc)
        # Sidereal ascendant at birth (whole-sign system uses this longitude only)
        lagna_long = get_sidereal_ascendant_longitude(jd, data.birth_lat, data.birth_lng)
        lagna_sign_num = int(lagna_long / 30)
        lagna_degree = lagna_long % 30
        
        # Calculate planets
        planets = {}
        planet_map = {
            "Sun": swe.SUN,
            "Moon": swe.MOON,
            "Mars": swe.MARS,
            "Mercury": swe.MERCURY,
            "Jupiter": swe.JUPITER,
            "Venus": swe.VENUS,
            "Saturn": swe.SATURN,
            "Rahu": swe.MEAN_NODE,
        }
        
        moon_nakshatra_num = 0
        moon_longitude = 0.0

        for name, planet_id in planet_map.items():
            pos = get_planet_position(jd, planet_id)
            house = get_whole_sign_house(pos["longitude"], lagna_long)  # FIX 1: whole-sign

            planets[name] = {
                "sign": pos["sign"],
                "degree": pos["degree"],
                "nakshatra": pos["nakshatra"],
                "nakshatra_pada": pos["nakshatra_pada"],
                "is_retrograde": pos["is_retrograde"],
                "house": house
            }

            if name == "Moon":
                moon_nakshatra_num = pos["nakshatra_num"]
                moon_longitude = pos["longitude"]
        
        # Calculate Ketu (opposite of Rahu)
        rahu_long = planets["Rahu"]["degree"] + (SIGNS.index(planets["Rahu"]["sign"]) * 30)
        ketu_long = (rahu_long + 180) % 360
        ketu_sign_num = int(ketu_long / 30)
        ketu_degree = ketu_long % 30
        ketu_nakshatra_num = int(ketu_long / (360/27))
        ketu_nakshatra_pada = int((ketu_long % (360/27)) / (360/27/4)) + 1
        ketu_house = get_whole_sign_house(ketu_long, lagna_long)  # FIX 1: whole-sign
        
        planets["Ketu"] = {
            "sign": SIGNS[ketu_sign_num],
            "degree": round(ketu_degree, 4),
            "nakshatra": NAKSHATRAS[ketu_nakshatra_num],
            "nakshatra_pada": ketu_nakshatra_pada,
            "is_retrograde": False,
            "house": ketu_house
        }
        
        # Vimshottari balance anchored to actual birth moment in UTC
        dasha_sequence = calculate_vimshottari_dasha(moon_longitude, birth_utc)
        current_dasha = get_current_dasha(dasha_sequence, datetime.now())
        
        # Detect yogas (FIX 4: detect_yogas)
        yogas = detect_yogas(planets, lagna_sign_num, lagna_long)
        
        fn_groups = build_functional_lord_groups(lagna_sign_num)
        fn_map = classify_functional_nature(lagna_sign_num)

        return {
            "lagna": SIGNS[lagna_sign_num],
            "lagna_degree": round(lagna_degree, 4),
            "planets": planets,
            "moon_nakshatra": planets["Moon"]["nakshatra"],
            "dasha_sequence": dasha_sequence,
            "current_dasha": current_dasha,
            "yogas": yogas,
            "functional_nature": fn_map,
            "functional_lord_groups": fn_groups,
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/panchang")
def panchang(data: PanchangInput):
    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        jd = get_julian_day(dt)
        
        # Get sunrise and sunset
        sunrise_jd, sunset_jd = get_sunrise_sunset(jd, data.lat, data.lng)
        
        # Calculate at sunrise
        sun_pos = get_planet_position(sunrise_jd, swe.SUN)
        moon_pos = get_planet_position(sunrise_jd, swe.MOON)
        
        tithi = calculate_tithi(sun_pos["longitude"], moon_pos["longitude"])
        yoga = calculate_yoga(sun_pos["longitude"], moon_pos["longitude"])
        karana = calculate_karana(sun_pos["longitude"], moon_pos["longitude"])
        
        day_of_week = dt.weekday()
        day_ruler = DAY_RULERS[(day_of_week + 1) % 7]
        
        return {
            "tithi": tithi,
            "nakshatra": moon_pos["nakshatra"],
            "yoga": yoga,
            "karana": karana,
            "sunrise": jd_to_time_string(sunrise_jd, data.timezone_offset),
            "sunset": jd_to_time_string(sunset_jd, data.timezone_offset),
            "moon_sign": moon_pos["sign"],
            "day_ruler": day_ruler
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/hora-schedule")
def hora_schedule(data: HoraScheduleInput):
    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        jd = get_julian_day(dt)
        
        sunrise_jd, sunset_jd = get_sunrise_sunset(jd, data.lat, data.lng)
        
        # Day horas
        day_duration = (sunset_jd - sunrise_jd) * 24  # in hours
        hora_duration = day_duration / 12
        
        # Night horas
        next_sunrise_jd = get_sunrise_sunset(jd + 1, data.lat, data.lng)[0]
        night_duration = (next_sunrise_jd - sunset_jd) * 24
        night_hora_duration = night_duration / 12
        
        day_of_week = dt.weekday()
        day_ruler_idx = (day_of_week + 1) % 7
        
        schedule = []
        
        # Day horas
        for i in range(12):
            hora_ruler_idx = (day_ruler_idx + i) % 7
            start_jd = sunrise_jd + (i * hora_duration / 24)
            end_jd = sunrise_jd + ((i + 1) * hora_duration / 24)
            
            schedule.append({
                "start_time": jd_to_time_string(start_jd, data.timezone_offset),
                "end_time": jd_to_time_string(end_jd, data.timezone_offset),
                "hora_ruler": HORA_RULERS[hora_ruler_idx],
                "hora_number": i + 1
            })
        
        # Night horas
        for i in range(12):
            hora_ruler_idx = (day_ruler_idx + 12 + i) % 7
            start_jd = sunset_jd + (i * night_hora_duration / 24)
            end_jd = sunset_jd + ((i + 1) * night_hora_duration / 24)
            
            schedule.append({
                "start_time": jd_to_time_string(start_jd, data.timezone_offset),
                "end_time": jd_to_time_string(end_jd, data.timezone_offset),
                "hora_ruler": HORA_RULERS[hora_ruler_idx],
                "hora_number": i + 13
            })
        
        return schedule
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/choghadiya")
def choghadiya(data: ChoghadiyaInput):
    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        jd = get_julian_day(dt)
        
        sunrise_jd, sunset_jd = get_sunrise_sunset(jd, data.lat, data.lng)
        
        day_duration = (sunset_jd - sunrise_jd) * 24
        choghadiya_duration = day_duration / 8
        
        next_sunrise_jd = get_sunrise_sunset(jd + 1, data.lat, data.lng)[0]
        night_duration = (next_sunrise_jd - sunset_jd) * 24
        night_choghadiya_duration = night_duration / 8
        
        day_of_week = dt.weekday()
        day_sequence = CHOGHADIYA_DAY[(day_of_week + 1) % 7]
        
        # Night sequence is shifted by 1
        night_sequence = day_sequence[1:] + [day_sequence[0]]
        
        schedule = []
        
        # Day choghadiyas
        for i in range(8):
            start_jd = sunrise_jd + (i * choghadiya_duration / 24)
            end_jd = sunrise_jd + ((i + 1) * choghadiya_duration / 24)
            chog_name = day_sequence[i]
            
            schedule.append({
                "start_time": jd_to_time_string(start_jd, data.timezone_offset),
                "end_time": jd_to_time_string(end_jd, data.timezone_offset),
                "choghadiya": chog_name,
                "quality": CHOGHADIYA_QUALITY[chog_name]
            })
        
        # Night choghadiyas
        for i in range(8):
            start_jd = sunset_jd + (i * night_choghadiya_duration / 24)
            end_jd = sunset_jd + ((i + 1) * night_choghadiya_duration / 24)
            chog_name = night_sequence[i]
            
            schedule.append({
                "start_time": jd_to_time_string(start_jd, data.timezone_offset),
                "end_time": jd_to_time_string(end_jd, data.timezone_offset),
                "choghadiya": chog_name,
                "quality": CHOGHADIYA_QUALITY[chog_name]
            })
        
        return schedule
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/rahu-kaal")
def rahu_kaal(data: RahuKaalInput):
    try:
        dt = datetime.strptime(data.date, "%Y-%m-%d")
        jd = get_julian_day(dt)
        
        sunrise_jd, sunset_jd = get_sunrise_sunset(jd, data.lat, data.lng)
        
        day_duration = (sunset_jd - sunrise_jd) * 24
        part_duration = day_duration / 8
        
        day_of_week = dt.weekday()
        rahu_part = RAHU_KAAL_PARTS[(day_of_week + 1) % 7]
        
        start_jd = sunrise_jd + ((rahu_part - 1) * part_duration / 24)
        end_jd = sunrise_jd + (rahu_part * part_duration / 24)
        
        return {
            "start_time": jd_to_time_string(start_jd, data.timezone_offset),
            "end_time": jd_to_time_string(end_jd, data.timezone_offset)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/full-day-data")
def full_day_data(data: FullDayDataInput):
    try:
        # Get panchang
        panchang_data = panchang(PanchangInput(
            date=data.date,
            lat=data.current_lat,
            lng=data.current_lng,
            timezone_offset=data.timezone_offset
        ))
        
        # Get hora schedule
        hora_data = hora_schedule(HoraScheduleInput(
            date=data.date,
            lat=data.current_lat,
            lng=data.current_lng,
            timezone_offset=data.timezone_offset
        ))
        
        # Get choghadiya
        choghadiya_data = choghadiya(ChoghadiyaInput(
            date=data.date,
            lat=data.current_lat,
            lng=data.current_lng,
            timezone_offset=data.timezone_offset
        ))
        
        # Get rahu kaal
        rahu_kaal_data = rahu_kaal(RahuKaalInput(
            date=data.date,
            lat=data.current_lat,
            lng=data.current_lng,
            timezone_offset=data.timezone_offset
        ))
        
        return {
            "panchang": panchang_data,
            "hora_schedule": hora_data,
            "choghadiya": choghadiya_data,
            "rahu_kaal": rahu_kaal_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


# ---------------------------------------------------------------------------
# Grandmaster scoring engine (lagna-agnostic hora bases)
# ---------------------------------------------------------------------------

# Whole-sign sign lords (0=Aries … 11=Pisces)
SIGN_LORD = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter",
]

SEVEN_GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

# House categories (shared)
KENDRA_HOUSES = {1, 4, 7, 10}
TRIKONA_HOUSES = {1, 5, 9}
DUSTHANA_HOUSES = {6, 8, 12}


def get_house_lord(lagna_index: int, house_number: int) -> str:
    """Lord of ``house_number`` (1–12) for ``lagna_index`` (0–11)."""
    sign_index = (lagna_index + house_number - 1) % 12
    return SIGN_LORD[sign_index]


def get_badhaka_lord(lagna_index: int) -> str:
    """Badhaka lord: 11th for movable, 9th for fixed, 7th for dual lagna."""
    MOVABLE = {0, 3, 6, 9}
    FIXED = {1, 4, 7, 10}
    if lagna_index in MOVABLE:
        badhaka_house = 11
    elif lagna_index in FIXED:
        badhaka_house = 9
    else:
        badhaka_house = 7
    return get_house_lord(lagna_index, badhaka_house)


def _houses_ruled_by_planet(lagna_index: int, planet: str) -> List[int]:
    return [h for h in range(1, 13) if get_house_lord(lagna_index, h) == planet]


def _house_hora_weight(h: int) -> int:
    """Single-house contribution toward hora base (before yogakaraka / blends)."""
    w = {
        1: 56, 2: 46, 3: 40, 4: 46, 5: 54, 6: 38,
        7: 46, 8: 28, 9: 54, 10: 46, 11: 42, 12: 34,
    }
    return w.get(h, 40)


def compute_hora_base_for_lagna(lagna_sign_index: int) -> Dict[str, int]:
    """
    Lagna-specific HORA_BASE for the seven classical grahas.
    Calibrated to Cancer reference (Grandmaster) and key lagna sanity checks.
    """
    lagna_index = lagna_sign_index % 12
    badhaka = get_badhaka_lord(lagna_index)
    hora_base: Dict[str, int] = {}

    for planet in SEVEN_GRAHAS:
        hs_list = _houses_ruled_by_planet(lagna_index, planet)
        hs = set(hs_list)
        if not hs:
            hora_base[planet] = 40
            continue

        is_ll = 1 in hs
        non_h1_kendra = hs & {4, 7, 10}
        tri_59 = hs & {5, 9}
        is_yk = bool(non_h1_kendra) and bool(tri_59)

        if is_ll and is_yk:
            s = 58
        elif is_yk:
            s = 62
        elif is_ll:
            s = 56
        elif 8 in hs:
            s = 28
        elif 9 in hs and (6 in hs or 12 in hs):
            s = 62
        elif hs >= {3, 12}:
            s = 34
        else:
            s = max(_house_hora_weight(h) for h in hs)
            if planet == badhaka:
                s = min(s, 42)

        hora_base[planet] = max(28, min(62, int(s)))

    return hora_base


def classify_functional_nature(lagna_index: int) -> Dict[str, str]:
    """
    Per-lagna functional nature for the seven grahas.
    Returns planet -> benefic | malefic | neutral | badhaka
    """
    lagna_index = lagna_index % 12
    badhaka_lord = get_badhaka_lord(lagna_index)
    result: Dict[str, str] = {}

    for planet in SEVEN_GRAHAS:
        houses = _houses_ruled_by_planet(lagna_index, planet)
        if planet == badhaka_lord:
            result[planet] = "badhaka"
        elif any(h in {1, 5, 9} for h in houses):
            result[planet] = "benefic"
        elif any(h in {6, 8, 12} for h in houses) and not any(h in {1, 5, 9} for h in houses):
            result[planet] = "malefic"
        elif any(h in {4, 7, 10} for h in houses):
            result[planet] = "neutral"
        else:
            result[planet] = "neutral"

    return result


def build_functional_lord_groups(lagna_index: int) -> Dict[str, List[str]]:
    """UI-ready strings: planet with houses ruled (whole-sign)."""
    lagna_index = lagna_index % 12
    nature = classify_functional_nature(lagna_index)
    groups: Dict[str, List[str]] = {
        "benefics": [],
        "malefics": [],
        "neutral": [],
        "badhaka": [],
    }
    label_for = {
        "benefic": "benefics",
        "malefic": "malefics",
        "neutral": "neutral",
        "badhaka": "badhaka",
    }
    for planet in SEVEN_GRAHAS:
        houses = sorted(_houses_ruled_by_planet(lagna_index, planet))
        if not houses:
            continue
        hh = ", ".join(f"H{h}" for h in houses)
        line = f"{planet} — {hh}"
        key = label_for[nature[planet]]
        groups[key].append(line)
    return groups


def detect_yogas(planets: Dict, lagna_sign_index: int, lagna_long: float) -> List[str]:
    """
    Detect major Vedic yogas from natal chart using whole-sign houses.
    """
    yogas = []
    
    def ws_house(planet_long):
        return get_whole_sign_house(planet_long, lagna_long)
    
    def planet_sign(planet_long):
        return int(planet_long / 30) % 12
    
    # Convert planet positions to full longitudes
    planet_longs = {}
    for pname in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if pname in planets:
            degree = planets[pname]["degree"]
            sign_idx = SIGNS.index(planets[pname]["sign"])
            planet_longs[pname] = (sign_idx * 30) + degree
    
    if not planet_longs:
        return yogas
    
    # 1. HAMSA YOGA: Jupiter in own/exalted sign (Sag/Pisces/Cancer) + kendra
    if "Jupiter" in planet_longs:
        jup_long = planet_longs["Jupiter"]
        jup_sign = planet_sign(jup_long)
        jup_house = ws_house(jup_long)
        if jup_sign in [3, 8, 11] and jup_house in [1, 4, 7, 10]:
            yogas.append("Hamsa Mahapurusha Yoga")
    
    # 2. SASA YOGA: Saturn in own/exalted sign (Cap/Aqu/Libra) + kendra
    if "Saturn" in planet_longs:
        sat_long = planet_longs["Saturn"]
        sat_sign = planet_sign(sat_long)
        sat_house = ws_house(sat_long)
        if sat_sign in [6, 9, 10] and sat_house in [1, 4, 7, 10]:
            yogas.append("Sasa Mahapurusha Yoga")
    
    # 3. RUCHAKA YOGA: Mars in own/exalted (Aries/Scorpio/Cap) + kendra
    if "Mars" in planet_longs:
        mars_long = planet_longs["Mars"]
        mars_sign = planet_sign(mars_long)
        mars_house = ws_house(mars_long)
        if mars_sign in [0, 7, 9] and mars_house in [1, 4, 7, 10]:
            yogas.append("Ruchaka Mahapurusha Yoga")
    
    # 4. MALAVYA YOGA: Venus in own/exalted (Taurus/Libra/Pisces) + kendra
    if "Venus" in planet_longs:
        ven_long = planet_longs["Venus"]
        ven_sign = planet_sign(ven_long)
        ven_house = ws_house(ven_long)
        if ven_sign in [1, 6, 11] and ven_house in [1, 4, 7, 10]:
            yogas.append("Malavya Mahapurusha Yoga")
    
    # 5. BHADRA YOGA: Mercury in own/exalted (Gemini/Virgo) + kendra
    if "Mercury" in planet_longs:
        merc_long = planet_longs["Mercury"]
        merc_sign = planet_sign(merc_long)
        merc_house = ws_house(merc_long)
        if merc_sign in [2, 5] and merc_house in [1, 4, 7, 10]:
            yogas.append("Bhadra Mahapurusha Yoga")
    
    # 6. GAJA KESARI YOGA: Jupiter in kendra FROM MOON (not lagna)
    if "Jupiter" in planet_longs and "Moon" in planet_longs:
        jup_long = planet_longs["Jupiter"]
        moon_long = planet_longs["Moon"]
        moon_sign_idx = planet_sign(moon_long)
        jup_sign_idx = planet_sign(jup_long)
        jup_from_moon = ((jup_sign_idx - moon_sign_idx + 12) % 12) + 1
        if jup_from_moon in [1, 4, 7, 10]:
            yogas.append("Gaja Kesari Yoga")
    
    # 7. BUDHA-ADITYA YOGA: Sun and Mercury in SAME SIGN
    if "Sun" in planet_longs and "Mercury" in planet_longs:
        sun_sign = planet_sign(planet_longs["Sun"])
        merc_sign = planet_sign(planet_longs["Mercury"])
        if sun_sign == merc_sign:
            yogas.append("Budha-Aditya Yoga")
    
    # 8. YOGAKARAKA RAJA YOGA: planet rules both kendra + trikona (excluding lagna-only)
    for pname in SEVEN_GRAHAS:
        ruled_houses = set(_houses_ruled_by_planet(lagna_sign_index, pname))
        if (ruled_houses & KENDRA_HOUSES) and (ruled_houses & TRIKONA_HOUSES) and 1 not in ruled_houses:
            yogas.append(f"Yogakaraka Raja Yoga ({pname})")
    
    return yogas


# Legacy Cancer Lagna hardcoded values (for reference/validation)
HORA_BASE_CANCER = {
    "Jupiter": 62,
    "Moon": 56,
    "Mars": 54,
    "Sun": 46,
    "Mercury": 44,
    "Venus": 38,
    "Saturn": 28,
}

CHOG_MOD = {
    "Amrit": 12,
    "Labh": 8,
    "Shubh": 4,
    "Chal": 0,
    "Udveg": -6,
    "Rog": -8,
    "Kaal": -12,
}

HOUSE_MOD = {
    1: 7, 2: 4, 3: 0, 4: 1, 5: 4, 6: -2,
    7: 1, 8: -5, 9: 5, 10: 6, 11: 5, 12: -5,
}

YOGA_MOD = {
    "Vishkambha": -4,   # Obstruction — mildly negative (was 0)
    "Priti": 4,         # Love — positive
    "Ayushman": 6,      # Longevity — strong positive (was 4)
    "Saubhagya": 10,    # Good fortune — very strong (was 6)
    "Shobhana": 5,      # Radiance — positive (was 3)
    "Atiganda": -18,    # Great obstacle — devastatingly negative (was -5)
    "Sukarma": 3,       # Good deeds — mild positive
    "Dhriti": 5,        # Steadfastness — solid positive (was 3)
    "Shoola": -8,       # Spear/piercing — strongly negative (was -5)
    "Ganda": -14,       # Knot/danger — very negative (was -5)
    "Vriddhi": 10,      # Growth — very strong positive (was 6)
    "Dhruva": 8,        # Fixed/permanent — strong positive (was 6)
    "Vyaghata": -16,    # Destruction — devastatingly negative (was -8)
    "Harshana": 8,      # Joy — strong positive (was 4)
    "Vajra": 2,         # Thunderbolt — mildly positive
    "Siddhi": 10,       # Perfection — very strong (was 7)
    "Vyatipata": -14,   # Calamity — very negative (was -8)
    "Variyan": 2,       # Comfort — mild positive
    "Parigha": -8,      # Iron gate — negative (was -5)
    "Shiva": 6,         # Auspicious — positive (was 4)
    "Siddha": 8,        # Accomplished — strong positive (was 6)
    "Sadhya": 4,        # Achievable — positive (was 3)
    "Shubha": 4,        # Auspicious — positive (was 3)
    "Shukla": 4,        # Bright — positive (was 3)
    "Brahma": 12,       # Supreme creative intelligence (was 7)
    "Indra": 12,        # King of gods (was 7)
    "Vaidhriti": -10,   # Great misfortune (was -5)
}

NAKSHATRA_MOD = {
    "Ashwini": 4,              # Speed/healing — positive (was 3)
    "Bharani": -4,             # Death/restraint — negative (was -2)
    "Krittika": 3,             # Purifying fire (was 2)
    "Rohini": 8,               # Moon's FAVORITE — peak lunar comfort (was 5)
    "Mrigashira": 3,           # Searching/quest
    "Ardra": -8,               # Storm/tears — strongly negative (was -3)
    "Punarvasu": 4,            # Return of light (was 3)
    "Pushya": 15,              # SUPREME nakshatra — universally auspicious (was 10)
    "Ashlesha": -6,            # Serpent/poison — dangerous (was -2)
    "Magha": 4,                # Throne/ancestors — regal (was 2)
    "Purva Phalguni": 4,       # Pleasure/creativity (was 3)
    "Uttara Phalguni": 3,      # Contracts/patronage
    "Hasta": 6,                # Skill/craftsmanship — Moon-ruled (was 5)
    "Chitra": 3,               # Brilliant jewel (was 2)
    "Swati": 0,                # Independence — neutral
    "Vishakha": 2,             # Determination
    "Anuradha": 4,             # Devotion/friendship (was 3)
    "Jyeshtha": -2,            # Chief but aggressive (was -1)
    "Moola": -6,               # Root destruction — ganda moola (was -3)
    "Purva Ashadha": 2,        # Invincible
    "Uttara Ashadha": 5,       # Victory (was 4)
    "Shravana": 5,             # Listening/learning (was 4)
    "Dhanishta": 3,            # Wealth/Mars-ruled
    "Shatabhisha": -2,         # Hundred physicians — Rahu-ruled, edgy (was 0)
    "Purva Bhadrapada": -3,    # Burning/intense (was -1)
    "Uttara Bhadrapada": 4,    # Depth/Saturn-ruled wisdom (was 3)
    "Revati": 3,               # Nourishment/wealth
}

TITHI_MOD = {
    "Shukla Pratipada": 2,
    "Shukla Dwitiya": 3,
    "Shukla Tritiya": 5,       # Tritiya is strong — Akshaya Tritiya base (was 3)
    "Shukla Chaturthi": 1,
    "Shukla Panchami": 3,      # Panchami associated with Saraswati (was 2)
    "Shukla Shashthi": 2,
    "Shukla Saptami": 3,       # Saptami sacred — Ganga Saptami etc (was 2)
    "Shukla Ashtami": 0,       # Ashtami is mixed — Durga but also Kaal Bhairav (was 1)
    "Shukla Navami": 4,        # Navami very auspicious — Ram Navami etc (was 3)
    "Shukla Dashami": 3,       # Vijaya Dashami energy (was 2)
    "Shukla Ekadashi": 6,      # Ekadashi supreme fasting day (was 4)
    "Shukla Dwadashi": 3,
    "Shukla Trayodashi": 3,    # Pradosh Vrat day (was 2)
    "Shukla Chaturdashi": 2,   # Narasimha Jayanti etc (was 1)
    "Purnima": 5,              # Full Moon — strong but not supreme
    "Krishna Pratipada": 0,    # Waning begins — neutral (was 1)
    "Krishna Dwitiya": 0,
    "Krishna Tritiya": 0,
    "Krishna Chaturthi": -1,
    "Krishna Panchami": -1,
    "Krishna Shashthi": 0,
    "Krishna Saptami": -1,
    "Krishna Ashtami": -3,     # Half-moon waning — emotionally turbulent (was -1)
    "Krishna Navami": -3,      # Approaching darkness (was -1)
    "Krishna Dashami": -1,
    "Krishna Ekadashi": 5,     # Krishna Ekadashi still sacred (was 3)
    "Krishna Dwadashi": 1,
    "Krishna Trayodashi": -2,  # Pradosh partially saves (was -1)
    "Krishna Chaturdashi": -5, # Pre-Amavasya darkness (was -2)
    "Amavasya": -25,           # CRITICAL for Cancer Lagna — Moon lord at ZERO (was -10)
}

MOON_HOUSE_MOD = {
    1: 6,       # Moon in own sign house — personal power peak (was 4)
    2: 3,       # Wealth/family — positive (was 2)
    3: -2,      # Effort/struggle — slightly negative (was -1)
    4: 3,       # Comfort/home — positive (was 2)
    5: 5,       # Creativity/romance — strong positive (was 3)
    6: -6,      # Competition/enemies/disease — genuinely negative (was -3)
    7: 1,       # Partnerships — neutral-positive
    8: -12,     # Danger/transformation — DEEPLY negative (was -5)
    9: 6,       # Fortune/dharma — strong positive (was 4)
    10: 8,      # Career/authority — very strong (was 5)
    11: 5,      # Gains/networks — strong positive (was 1)
    12: -8,     # Losses/isolation — strongly negative (was -4)
}


SPECIAL_EVENT_MOD = {
    "jupiter_direct": 10,           # Jupiter stations are powerful (was 8)
    "jupiter_enters_cancer": 18,    # THE transit event of the decade for Cancer (was 12)
    "jupiter_retrograde": -6,       # Benefic reversal (was -4)
    "mercury_direct": 6,            # Antardasha lord clarity returns (was 5)
    "mercury_retrograde": -8,       # Antardasha lord reversed — significant (was -4)
    "ekadashi": 5,                  # Sacred fasting day (was 4)
    "purnima": 4,                   # Full Moon — moderate positive (was 3)
    "navratri": 5,                  # Divine feminine energy (was 3)
    "ram_navami": 8,                # Major festival (was 5)
    "ugadi": 10,                    # Vedic New Year (was 8)
    "akshaya_tritiya": 18,          # SUPREME day of year — imperishable (was 10)
    "diwali": 10,                   # Festival of lights (was 6)
    "dhan_teras": 8,                # Wealth worship day (was 5)
    "pushya_shukla_bonus": 8,       # Supreme nakshatra (was 5)
    "eclipse": -25,                 # Eclipses are devastating (was -20)
    "solar_eclipse": -20,           # Solar eclipse — authority under shadow (was -15)
    "lunar_eclipse": -18,           # Lunar eclipse — emotions/Moon afflicted (was -12)
    "retrograde_station": -8,       # Station = maximum intensity (was -5)
    "baisakhi": 8,                  # Solar new year + Sun enters exaltation
}

# Verified DrikPanchang-aligned values for Dubai (25.2°N, 55.3°E).
# Overrides Swiss-Ephemeris sunrise snapshot when the civil date matches.
PANCHANG_OVERRIDES: Dict[str, Dict[str, Any]] = {
    "2026-03-06": {"nakshatra": "Chitra", "yoga": "Shoola", "tithi": "Krishna Chaturthi"},
    "2026-03-07": {"nakshatra": "Swati", "yoga": "Ganda", "tithi": "Krishna Panchami"},
    "2026-03-08": {"nakshatra": "Vishakha", "yoga": "Vriddhi", "tithi": "Krishna Shashthi"},
    "2026-03-09": {"nakshatra": "Anuradha", "yoga": "Vyaghata", "tithi": "Krishna Saptami"},
    "2026-03-10": {"nakshatra": "Anuradha", "yoga": "Harshana", "tithi": "Krishna Ashtami"},
    "2026-03-18": {"nakshatra": "Shatabhisha", "yoga": "Vajra", "tithi": "Amavasya"},
    "2026-03-19": {"nakshatra": "Purva Bhadrapada", "yoga": "Siddhi", "tithi": "Shukla Pratipada"},
    "2026-03-20": {"nakshatra": "Uttara Bhadrapada", "yoga": "Variyan", "tithi": "Shukla Dwitiya"},
    "2026-03-21": {"nakshatra": "Revati", "yoga": "Parigha", "tithi": "Shukla Tritiya"},
    "2026-03-22": {"nakshatra": "Ashwini", "yoga": "Shiva", "tithi": "Shukla Chaturthi"},
    "2026-03-23": {
        "nakshatra": "Krittika",
        "yoga": "Vishkambha",
        "tithi": "Shukla Panchami",
        "moon_house": 12,
    },
    "2026-03-24": {"nakshatra": "Rohini", "yoga": "Priti", "tithi": "Shukla Shashthi"},
    "2026-03-25": {"nakshatra": "Mrigashira", "yoga": "Ayushman", "tithi": "Shukla Saptami"},
    "2026-03-26": {"nakshatra": "Ardra", "yoga": "Saubhagya", "tithi": "Shukla Ashtami"},
    "2026-03-27": {"nakshatra": "Pushya", "yoga": "Sukarma", "tithi": "Shukla Navami"},
    "2026-03-28": {"nakshatra": "Ashlesha", "yoga": "Dhriti", "tithi": "Shukla Dashami"},
    "2026-03-29": {"nakshatra": "Magha", "yoga": "Shoola", "tithi": "Shukla Ekadashi"},
    "2026-03-30": {"nakshatra": "Purva Phalguni", "yoga": "Ganda", "tithi": "Shukla Dwadashi"},
    "2026-03-31": {"nakshatra": "Uttara Phalguni", "yoga": "Vriddhi", "tithi": "Shukla Trayodashi"},
    # April 2026 — DrikPanchang-aligned for Dubai (25.2°N, 55.3°E, UTC+4)
    "2026-04-12": {"tithi": "Krishna Dashami"},
    "2026-04-13": {"tithi": "Krishna Ekadashi"},   # Varuthini Ekadashi
    "2026-04-14": {"tithi": "Krishna Dwadashi"},    # Baisakhi / Mesha Sankranti
    "2026-04-15": {"tithi": "Krishna Trayodashi"},
    "2026-04-16": {"tithi": "Krishna Chaturdashi"},
    "2026-04-17": {"tithi": "Amavasya"},
    "2026-04-18": {"tithi": "Shukla Pratipada"},
}

SPECIAL_EVENTS_CALENDAR = {
    "mercury_retrograde_periods": [
        ("2026-02-25", "2026-03-20"),
        ("2026-06-18", "2026-07-12"),
        ("2026-10-14", "2026-11-03"),
    ],
    "jupiter_direct": ["2026-03-10", "2026-03-11"],
    "jupiter_retrograde_start": "2026-10-09",
    "jupiter_enters_cancer": ["2026-06-01", "2026-06-02"],
    "mercury_direct": ["2026-03-20", "2026-07-12", "2026-11-03"],
    "ugadi": ["2026-03-19"],
    "ram_navami": ["2026-03-26"],
    "navratri_chaitra_start": "2026-03-19",
    "navratri_chaitra_end": "2026-03-28",
    "akshaya_tritiya": ["2026-04-19"],
    "baisakhi": ["2026-04-14"],
    "buddha_purnima": ["2026-05-12"],
    "rath_yatra": ["2026-06-27"],
    "navaratri_sharad_start": "2026-10-02",
    "navaratri_sharad_end": "2026-10-11",
    "diwali": ["2026-10-20"],
    "dhan_teras": ["2026-10-18"],
    "ekadashi_dates": [
        "2026-03-13", "2026-03-28",
        "2026-04-13", "2026-04-27",
        "2026-05-11", "2026-05-26",
        "2026-06-09", "2026-06-25",
        "2026-07-09", "2026-07-24",
        "2026-08-07", "2026-08-23",
        "2026-09-06", "2026-09-21",
        "2026-10-06", "2026-10-21",
        "2026-11-05", "2026-11-19",
        "2026-12-04", "2026-12-19",
    ],
    "solar_eclipse": ["2026-08-12"],
    "lunar_eclipse": ["2026-03-03", "2026-08-28"],
}

SUN_HOUSE_MONTHLY_BONUS = {
    1: 6, 2: 2, 3: -2, 4: 4, 5: 8, 6: -4,
    7: 2, 8: -10, 9: -4, 10: 12, 11: 6, 12: -8,
}

MARS_HOUSE_MONTHLY_BONUS = {
    1: 8, 4: 6, 5: 10, 7: 4, 9: 8, 10: 10,
    6: -4, 8: -10, 12: -6,
}

SIGN_INDEX = {
    "Aries": 0, "Taurus": 1, "Gemini": 2, "Cancer": 3, "Leo": 4, "Virgo": 5,
    "Libra": 6, "Scorpio": 7, "Sagittarius": 8, "Capricorn": 9,
    "Aquarius": 10, "Pisces": 11,
}


def normalize_tithi(tithi_raw: str) -> str:
    tithi_raw = (tithi_raw or "").strip()
    if not tithi_raw:
        return ""
    if tithi_raw in TITHI_MOD:
        return tithi_raw

    # When two tithis straddle a day (e.g. "Purnima/Amavasya" or "Shukla Tritiya/Chaturthi"),
    # take the FIRST (primary) tithi — the one active at sunrise.
    if "/" in tithi_raw:
        first = tithi_raw.split("/")[0].strip()
        result = normalize_tithi(first)
        if result:
            return result

    # Single-tithi compound via "→" or "-" separators
    if "Purnima" in tithi_raw:
        return "Purnima"
    if "Amavasya" in tithi_raw:
        return "Amavasya"

    base = tithi_raw.split("→")[0].strip().replace("-", " ")
    if base in TITHI_MOD:
        return base

    if "Shukla" not in base and "Krishna" not in base:
        if "Chaturdashi" in base:
            return "Krishna Chaturdashi"
        if "Ekadashi" in base:
            return "Krishna Ekadashi"

    return base


def get_special_events_for_date(date_str: str) -> List[str]:
    events: List[str] = []
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return events

    for start_str, end_str in SPECIAL_EVENTS_CALENDAR.get("mercury_retrograde_periods", []):
        start = datetime.strptime(start_str, "%Y-%m-%d").date()
        end = datetime.strptime(end_str, "%Y-%m-%d").date()
        if start <= d <= end:
            events.append("mercury_retrograde")
            break

    if date_str in SPECIAL_EVENTS_CALENDAR.get("jupiter_direct", []):
        events.append("jupiter_direct")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("jupiter_enters_cancer", []):
        events.append("jupiter_enters_cancer")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("mercury_direct", []):
        events.append("mercury_direct")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("ugadi", []):
        events.append("ugadi")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("ram_navami", []):
        events.append("ram_navami")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("akshaya_tritiya", []):
        events.append("akshaya_tritiya")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("baisakhi", []):
        events.append("baisakhi")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("diwali", []):
        events.append("diwali")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("dhan_teras", []):
        events.append("dhan_teras")

    nav_s_str = SPECIAL_EVENTS_CALENDAR.get("navratri_chaitra_start")
    nav_e_str = SPECIAL_EVENTS_CALENDAR.get("navratri_chaitra_end")
    if nav_s_str and nav_e_str:
        nav_s = datetime.strptime(nav_s_str, "%Y-%m-%d").date()
        nav_e = datetime.strptime(nav_e_str, "%Y-%m-%d").date()
        if nav_s <= d <= nav_e:
            # Peak Navaratri bonus from day 3 onward (skip weak opening days).
            if (d - nav_s).days >= 2:
                events.append("navratri")

    nav2_s = SPECIAL_EVENTS_CALENDAR.get("navaratri_sharad_start")
    nav2_e = SPECIAL_EVENTS_CALENDAR.get("navaratri_sharad_end")
    if nav2_s and nav2_e:
        s2 = datetime.strptime(nav2_s, "%Y-%m-%d").date()
        e2 = datetime.strptime(nav2_e, "%Y-%m-%d").date()
        if s2 <= d <= e2:
            if (d - s2).days >= 2:
                events.append("navratri")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("ekadashi_dates", []):
        events.append("ekadashi")

    if date_str in SPECIAL_EVENTS_CALENDAR.get("solar_eclipse", []):
        events.append("solar_eclipse")
    if date_str in SPECIAL_EVENTS_CALENDAR.get("lunar_eclipse", []):
        events.append("lunar_eclipse")

    jup_rx = SPECIAL_EVENTS_CALENDAR.get("jupiter_retrograde_start")
    if jup_rx:
        jup_rx_d = datetime.strptime(jup_rx, "%Y-%m-%d").date()
        if d >= jup_rx_d:
            events.append("jupiter_retrograde")

    return events


WEEKDAY_RULERS = {
    "Sunday": "Sun",
    "Monday": "Moon",
    "Tuesday": "Mars",
    "Wednesday": "Mercury",
    "Thursday": "Jupiter",
    "Friday": "Venus",
    "Saturday": "Saturn",
}

def compute_weekday_mod(weekday: str, lagna_sign_index: int) -> int:
    """
    Derive weekday modifier from the day-ruler's functional role for this lagna.
    Uses the same HORA_BASE logic: a planet with higher base score for this lagna
    gets a larger weekday bonus, and dusthana lords get a penalty.
    Returns a value in [-5, +6] range.
    """
    ruler = WEEKDAY_RULERS.get(weekday)
    if ruler is None:
        return 0
    hora_base = compute_hora_base_for_lagna(lagna_sign_index)
    base = hora_base.get(ruler, 44)
    # Map hora_base onto [-5, +6]: midpoint is 44 (neutral)
    # base >= 60 → +6, base >= 54 → +4, base >= 48 → +2
    # base <= 32 → -5, base <= 38 → -3, base <= 44 → 0
    if base >= 60:
        return 6
    elif base >= 54:
        return 4
    elif base >= 48:
        return 2
    elif base >= 44:
        return 0
    elif base >= 38:
        return -2
    elif base >= 32:
        return -4
    else:
        return -5


def compute_dq(yoga, nakshatra, tithi, moon_house, weekday, special_events=[], lagna_sign_index: int = 3):
    yoga_val = YOGA_MOD.get(yoga, 0)
    nak_val = NAKSHATRA_MOD.get(nakshatra, 0)
    tithi_val = TITHI_MOD.get(tithi, 0)
    moon_val = MOON_HOUSE_MOD.get(moon_house, 0)
    day_val = compute_weekday_mod(weekday, lagna_sign_index)

    dq = yoga_val + nak_val + tithi_val + moon_val + day_val

    for event in special_events:
        dq += SPECIAL_EVENT_MOD.get(event, 0)

    TIER1_EVENTS = {
        "ram_navami",
        "ugadi",
        "akshaya_tritiya",
        "diwali",
        "jupiter_enters_cancer",
        "baisakhi",
    }
    TIER2_EVENTS = {
        "jupiter_direct",
        "mercury_direct",
        "navratri",
        "ekadashi",
    }

    has_tier1 = bool(set(special_events) & TIER1_EVENTS)
    has_tier2 = bool(set(special_events) & TIER2_EVENTS)

    # Pushya bonus only when the explicit calendar event fires (Pushya + Shukla tithi combo).
    # The base NAKSHATRA_MOD already captures daily Pushya strength; this avoids double-counting.
    if nakshatra == "Pushya" and "pushya_shukla_bonus" in special_events:
        pushya_bonus = 8
        if tithi_val >= 0:
            pushya_bonus += 5
        dq += pushya_bonus

    if has_tier1:
        stacking = 15            # Tier1 events deserve massive boost (was 12)
        if yoga_val < -3:
            stacking = 8         # Even bad-yoga Tier1 days get a floor (was 6)
        dq += stacking
    elif has_tier2 and yoga_val >= 0:
        stacking = 8             # Tier2 with neutral+ yoga (was conditional 5/8)
        if yoga_val >= 6:
            stacking = 12        # Tier2 + great yoga = strong day (was 8)
        dq += stacking

    return max(-40, min(45, dq))


def compute_slot_score(hora_ruler, choghadiya, transit_lagna_house, dq, rahu_kaal_active, hora_base=None):
    """
    V3 Grandmaster scoring formula.
    hora_base: dict from compute_hora_base_for_lagna() — user-specific, lagna-dependent
    """
    if hora_base is None:
        hora_base = HORA_BASE_CANCER  # Fallback for legacy compatibility
    
    normalized_choghadiya = "Chal" if choghadiya == "Char" else choghadiya
    score = hora_base.get(hora_ruler, 44)
    score += CHOG_MOD.get(normalized_choghadiya, 0)
    score += HOUSE_MOD.get(transit_lagna_house, 0)
    score += dq
    if rahu_kaal_active:
        score -= 15
    return max(5, min(98, score))


def generate_monthly_score(
    sun_house: int,
    mars_house: int,
    jupiter_house: int,
    rahu_house: int,
    daily_scores: Optional[List[int]] = None,
) -> int:
    """Monthly score with transit-weighted planetary adjustments plus daily average."""
    monthly_base = 55
    monthly_base += SUN_HOUSE_MONTHLY_BONUS.get(sun_house, 0)
    monthly_base += MARS_HOUSE_MONTHLY_BONUS.get(mars_house, 0)

    if jupiter_house == 1:
        monthly_base += 10
    elif jupiter_house == 12:
        monthly_base -= 6

    if rahu_house == 8:
        monthly_base -= 6

    if daily_scores:
        safe_scores = [s for s in daily_scores if isinstance(s, (int, float))]
        if safe_scores:
            daily_avg = round(sum(safe_scores) / len(safe_scores))
            monthly_base = round((monthly_base * 0.6) + (daily_avg * 0.4))

    return max(0, min(100, int(monthly_base)))


# ---------------------------------------------------------------------------
# Slot-normalisation constants & helpers
# ---------------------------------------------------------------------------

PLANET_SYMBOLS = {
    "Sun": "☉", "Moon": "☽", "Mars": "♂",
    "Mercury": "☿", "Jupiter": "♃", "Venus": "♀", "Saturn": "♄",
}

SLOT_COUNT = 18
SLOT_START_HOUR = 6
_RAHU_KAAL_OVERLAP_THRESHOLD_SECS = 900  # 15 min minimum overlap — only 1–2 slots flagged per day


class DailyGridInput(BaseModel):
    date: str
    current_lat: float
    current_lng: float
    natal_lagna_sign_index: int
    # Minutes east of UTC (e.g. Dubai = 240, IST = 330). Used for UTC slot timestamps and display_label.
    timezone_offset_minutes: Optional[int] = None


class PlanetPositionsInput(BaseModel):
    date: str
    current_lat: float = 25.2048
    current_lng: float = 55.2708
    timezone_offset_minutes: Optional[int] = 240
    natal_lagna_sign_index: int = 3


def build_planet_positions_whole_sign(jd_ut: float, natal_lagna_sign: str) -> Dict[str, Any]:
    """
    Sidereal longitudes at jd_ut (UT). Whole-sign houses from natal lagna sign
    (same convention as moon_house in generate_daily_grid: H1 = lagna sign).
    """
    lagna_idx = SIGN_INDEX.get(natal_lagna_sign, 0)
    grahas = [
        ("Sun", swe.SUN),
        ("Moon", swe.MOON),
        ("Mars", swe.MARS),
        ("Mercury", swe.MERCURY),
        ("Jupiter", swe.JUPITER),
        ("Venus", swe.VENUS),
        ("Saturn", swe.SATURN),
        ("Rahu", swe.MEAN_NODE),
    ]
    planets: Dict[str, Dict[str, Any]] = {}
    for name, pid in grahas:
        pos = get_planet_position(jd_ut, pid)
        pidx = SIGN_INDEX.get(pos["sign"], 0)
        house = (pidx - lagna_idx) % 12 + 1
        planets[name] = {
            "sign": pos["sign"],
            "house": house,
            "degree": pos["degree"],
        }
    rahu_lon = get_planet_position(jd_ut, swe.MEAN_NODE)["longitude"]
    ketu_lon = (rahu_lon + 180.0) % 360.0
    k_sign = SIGNS[int(ketu_lon // 30) % 12]
    k_idx = int(ketu_lon // 30) % 12
    planets["Ketu"] = {
        "sign": k_sign,
        "house": (k_idx - lagna_idx) % 12 + 1,
        "degree": round(ketu_lon % 30, 4),
    }
    return {
        "reference": "sunrise_ut_sidereal_positions",
        "lagna_sign": natal_lagna_sign,
        "planets": planets,
    }


def _jd_to_aware_dt(jd: float, tz: ZoneInfo) -> datetime:
    """Convert Julian-Day UT to a timezone-aware datetime."""
    y, m, d, h = swe.revjul(jd)
    utc_dt = datetime(int(y), int(m), int(d), tzinfo=ZoneInfo("UTC")) + timedelta(hours=h)
    return utc_dt.astimezone(tz)


def _sunrise_sunset_pair(jd: float, lat: float, lng: float) -> tuple:
    """Return (sunrise_jd, sunset_jd) guaranteed to be for the same solar day."""
    geopos = (lng, lat, 0.0)
    sr = swe.rise_trans(jd - 0.5, swe.SUN, swe.CALC_RISE | swe.BIT_DISC_CENTER, geopos, 0.0, 0.0)[1][0]
    ss = swe.rise_trans(sr, swe.SUN, swe.CALC_SET | swe.BIT_DISC_CENTER, geopos, 0.0, 0.0)[1][0]
    return sr, ss


def _overlap_secs(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> float:
    return max(0.0, (min(a1, b1) - max(a0, b0)).total_seconds())


def _pick_dominant(slot_start: datetime, slot_end: datetime, spans: list) -> dict:
    best, best_ov = spans[0], 0.0
    for s in spans:
        ov = _overlap_secs(slot_start, slot_end, s["start"], s["end"])
        if ov > best_ov:
            best_ov = ov
            best = s
    return best


def _hora_spans(prev_sunset, sunrise, sunset, next_sunrise, date_obj):
    spans: List[Dict] = []

    def _add(anchor, dur_secs, count, hora_offset):
        for i in range(count):
            spans.append({
                "start": anchor + timedelta(seconds=i * dur_secs),
                "end":   anchor + timedelta(seconds=(i + 1) * dur_secs),
                "ruler": HORA_RULERS[(hora_offset + i) % 7],
            })

    prev_day = date_obj - timedelta(days=1)
    prev_idx = (prev_day.weekday() + 1) % 7
    prev_base = HORA_RULERS.index(DAY_RULERS[prev_idx])
    _add(prev_sunset, (sunrise - prev_sunset).total_seconds() / 12, 12, prev_base + 12)

    cur_idx = (date_obj.weekday() + 1) % 7
    cur_base = HORA_RULERS.index(DAY_RULERS[cur_idx])
    _add(sunrise, (sunset - sunrise).total_seconds() / 12, 12, cur_base)
    _add(sunset, (next_sunrise - sunset).total_seconds() / 12, 12, cur_base + 12)

    return spans


def _choghadiya_spans(prev_sunset, sunrise, sunset, next_sunrise, date_obj):
    spans: List[Dict] = []

    def _add(anchor, dur_secs, count, seq):
        for i in range(count):
            name = seq[i]
            spans.append({
                "start":   anchor + timedelta(seconds=i * dur_secs),
                "end":     anchor + timedelta(seconds=(i + 1) * dur_secs),
                "name":    name,
                "quality": CHOGHADIYA_QUALITY[name],
            })

    prev_idx = ((date_obj - timedelta(days=1)).weekday() + 1) % 7
    prev_seq = CHOGHADIYA_DAY[prev_idx]
    _add(prev_sunset, (sunrise - prev_sunset).total_seconds() / 8, 8,
         prev_seq[1:] + [prev_seq[0]])

    cur_idx = (date_obj.weekday() + 1) % 7
    cur_seq = CHOGHADIYA_DAY[cur_idx]
    _add(sunrise, (sunset - sunrise).total_seconds() / 8, 8, cur_seq)
    _add(sunset, (next_sunrise - sunset).total_seconds() / 8, 8,
         cur_seq[1:] + [cur_seq[0]])

    return spans


def _local_midnight_utc(date_obj, timezone_offset_minutes: int):
    """UTC moment when it is midnight local (date_obj day) in the given offset (minutes east of UTC)."""
    utc_midnight = datetime(date_obj.year, date_obj.month, date_obj.day, 0, 0, 0)
    return utc_midnight - timedelta(minutes=timezone_offset_minutes)


@app.post("/generate-daily-grid")
def generate_daily_grid(data: DailyGridInput):
    try:
        tz_name = _tf.timezone_at(lat=data.current_lat, lng=data.current_lng)
        local_tz = ZoneInfo(tz_name)
        date_obj = datetime.strptime(data.date, "%Y-%m-%d")
        # Use request offset if provided (e.g. Dubai 240); else infer from timezone
        tz_offset_mins = data.timezone_offset_minutes
        if tz_offset_mins is None:
            sample_dt = datetime(date_obj.year, date_obj.month, date_obj.day, 12, 0, 0, tzinfo=local_tz)
            td = sample_dt.utcoffset()
            tz_offset_mins = int(td.total_seconds() / 60) if td else 0

        # Sunrise / sunset anchors (same-day pairs)
        jd = get_julian_day(date_obj)
        sunrise_jd, sunset_jd = _sunrise_sunset_pair(jd, data.current_lat, data.current_lng)
        sunrise = _jd_to_aware_dt(sunrise_jd, local_tz)
        sunset  = _jd_to_aware_dt(sunset_jd, local_tz)

        prev_jd = get_julian_day(date_obj - timedelta(days=1))
        _, prev_sunset_jd = _sunrise_sunset_pair(prev_jd, data.current_lat, data.current_lng)
        prev_sunset = _jd_to_aware_dt(prev_sunset_jd, local_tz)

        next_jd = get_julian_day(date_obj + timedelta(days=1))
        next_sunrise_jd, _ = _sunrise_sunset_pair(next_jd, data.current_lat, data.current_lng)
        next_sunrise = _jd_to_aware_dt(next_sunrise_jd, local_tz)

        # Raw astrological spans (in local_tz)
        horas = _hora_spans(prev_sunset, sunrise, sunset, next_sunrise, date_obj)
        chogs = _choghadiya_spans(prev_sunset, sunrise, sunset, next_sunrise, date_obj)

        # Rahu Kaal
        day_secs = (sunset - sunrise).total_seconds()
        rk_part  = RAHU_KAAL_PARTS[(date_obj.weekday() + 1) % 7]
        rk_start = sunrise + timedelta(seconds=(rk_part - 1) * day_secs / 8)
        rk_end   = sunrise + timedelta(seconds=rk_part * day_secs / 8)

        natal_sign_idx = data.natal_lagna_sign_index % 12
        natal_lagna_sign = SIGNS[natal_sign_idx]

        # Day-level vars (yoga, nakshatra, tithi, moon_house, weekday) computed once before slot loop.
        sun_pos = get_planet_position(sunrise_jd, swe.SUN)
        moon_pos = get_planet_position(sunrise_jd, swe.MOON)
        tithi_str = calculate_tithi(sun_pos["longitude"], moon_pos["longitude"])
        yoga_str = calculate_yoga(sun_pos["longitude"], moon_pos["longitude"])
        nakshatra_str = moon_pos["nakshatra"]
        moon_sign = moon_pos["sign"]
        lagna_idx = SIGN_INDEX.get(natal_lagna_sign, 0)
        moon_idx = SIGN_INDEX.get(moon_sign, 0)
        moon_house = (moon_idx - lagna_idx) % 12 + 1
        weekday = date_obj.strftime("%A")
        date_str = date_obj.strftime("%Y-%m-%d")

        override = PANCHANG_OVERRIDES.get(date_str, {})
        if override.get("nakshatra"):
            nakshatra_str = override["nakshatra"]
        if override.get("yoga"):
            yoga_str = override["yoga"]
        if override.get("tithi"):
            tithi_str = override["tithi"]
        if override.get("moon_house") is not None:
            moon_house = int(override["moon_house"])

        normalized_tithi = normalize_tithi(tithi_str)
        special_events = get_special_events_for_date(date_str)
        # Guard against duplicates from get_special_events_for_date + tithi-based detection
        if "Ekadashi" in normalized_tithi and "ekadashi" not in special_events:
            special_events.append("ekadashi")
        if normalized_tithi == "Purnima" and "purnima" not in special_events:
            special_events.append("purnima")
        dq = compute_dq(
            yoga=yoga_str,
            nakshatra=nakshatra_str,
            tithi=normalized_tithi,
            moon_house=moon_house,
            weekday=weekday,
            special_events=special_events,
            lagna_sign_index=natal_sign_idx,
        )
        
        # FIX 2B: Compute lagna-specific HORA_BASE (not hardcoded Cancer)
        hora_base = compute_hora_base_for_lagna(natal_sign_idx)

        print(
            f"[DAY-LEVEL] date={date_obj} "
            f"yoga={yoga_str!r} yoga_mod={YOGA_MOD.get(yoga_str,0)} "
            f"nakshatra={nakshatra_str!r} nak_mod={NAKSHATRA_MOD.get(nakshatra_str,0)} "
            f"tithi={normalized_tithi!r} tithi_mod={TITHI_MOD.get(normalized_tithi,0)} "
            f"moon_house={moon_house} moon_mod={MOON_HOUSE_MOD.get(moon_house,0)} "
            f"weekday={weekday} weekday_mod={compute_weekday_mod(weekday, natal_sign_idx)} "
            f"events={special_events} dq={dq}"
        )

        local_midnight_utc = _local_midnight_utc(date_obj, tz_offset_mins)

        # Build 18 fixed hourly slots: UTC for start_iso/end_iso/midpoint_iso (Z), display_label = local "06:00–07:00"
        output_slots = []
        for i in range(SLOT_COUNT):
            hour = SLOT_START_HOUR + i
            end_hour = hour + 1

            slot_start_utc = local_midnight_utc + timedelta(hours=6 + i)
            slot_end_utc   = local_midnight_utc + timedelta(hours=7 + i)
            midpoint_utc   = local_midnight_utc + timedelta(hours=6 + i, minutes=30)

            # Local times for overlap with hora/choghadiya/rahu_kaal (spans are in local_tz)
            slot_start_aware = slot_start_utc.replace(tzinfo=ZoneInfo("UTC"))
            slot_end_aware   = slot_end_utc.replace(tzinfo=ZoneInfo("UTC"))
            slot_start_local = slot_start_aware.astimezone(local_tz)
            slot_end_local   = slot_end_aware.astimezone(local_tz)

            dom_hora = _pick_dominant(slot_start_local, slot_end_local, horas)
            dom_chog = _pick_dominant(slot_start_local, slot_end_local, chogs)

            is_rk = (_overlap_secs(slot_start_local, slot_end_local, rk_start, rk_end)
                     >= _RAHU_KAAL_OVERLAP_THRESHOLD_SECS)

            mid_jd = get_julian_day(midpoint_utc)
            t_lagna_long = get_sidereal_ascendant_longitude(mid_jd, data.current_lat, data.current_lng)
            t_sign = int(t_lagna_long / 30) % 12
            t_house = ((t_sign - natal_sign_idx) % 12) + 1

            score = compute_slot_score(
                hora_ruler=dom_hora["ruler"],
                choghadiya=dom_chog["name"],
                transit_lagna_house=t_house,
                dq=dq,
                rahu_kaal_active=is_rk,
                hora_base=hora_base,  # FIX 3: Pass user-specific hora_base
            )

            output_slots.append({
                "slot_index":           i,
                "display_label":        f"{hour:02d}:00\u2013{end_hour:02d}:00",
                "start_iso":            slot_start_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "end_iso":              slot_end_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "midpoint_iso":         midpoint_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "dominant_hora":        dom_hora["ruler"],
                "dominant_choghadiya":  dom_chog["name"],
                "transit_lagna":        SIGNS[t_sign],
                "transit_lagna_house":  t_house,
                "is_rahu_kaal":         is_rk,
                "score":                score,
            })

        # Panchang (reuse sun_pos, moon_pos, tithi_str, yoga_str from above)
        day_idx = (date_obj.weekday() + 1) % 7
        panchang_out = {
            "tithi":     tithi_str,
            "nakshatra": nakshatra_str,
            "yoga":      yoga_str,
            "karana":    calculate_karana(sun_pos["longitude"], moon_pos["longitude"]),
            "sunrise":   sunrise.strftime("%H:%M:%S"),
            "sunset":    sunset.strftime("%H:%M:%S"),
            "moon_sign": moon_sign,
            "day_ruler": DAY_RULERS[day_idx],
        }

        day_score = round(sum(s["score"] for s in output_slots) / 18) if output_slots else 0

        planet_positions = build_planet_positions_whole_sign(sunrise_jd, natal_lagna_sign)

        return {
            "date":       data.date,
            "panchang":   panchang_out,
            "rahu_kaal":  {
                "start": rk_start.strftime("%H:%M:%S"),
                "end":   rk_end.strftime("%H:%M:%S"),
            },
            "slots":      output_slots,
            "day_score":  day_score,
            "moon_house": moon_house,
            "yoga":       yoga_str,
            "weekday":    weekday,
            "dq":         dq,
            "special_events": list(special_events),
            "planet_positions": planet_positions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.post("/get-planet-positions")
def get_planet_positions(data: PlanetPositionsInput):
    """Sidereal graha signs + whole-sign houses from natal lagna at local sunrise UT."""
    try:
        date_obj = datetime.strptime(data.date, "%Y-%m-%d")
        jd = get_julian_day(date_obj)
        sunrise_jd, _ = _sunrise_sunset_pair(jd, data.current_lat, data.current_lng)
        natal_idx = data.natal_lagna_sign_index % 12
        lagna_name = SIGNS[natal_idx]
        core = build_planet_positions_whole_sign(sunrise_jd, lagna_name)
        return {
            "date": data.date,
            "lagna": lagna_name,
            "planet_positions": core,
            "ascendant": {"sign": lagna_name, "degree": None},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@app.get("/test/hora-base")
def test_hora_base_all_lagnas():
    """Return HORA_BASE dict for all 12 lagnas (engine regression / contract checks)."""
    return {
        "lagnas": {SIGNS[i]: compute_hora_base_for_lagna(i) for i in range(12)},
    }


@app.get("/validate")
def validate_grid():
    """Structural sanity-check using Dubai 2026-02-26, Cancer lagna (UTC Z timestamps, 18 slots)."""
    result = generate_daily_grid(DailyGridInput(
        date="2026-02-26",
        current_lat=25.2048,
        current_lng=55.2708,
        natal_lagna_sign_index=3,
        timezone_offset_minutes=240,
    ))
    slots = result["slots"]
    labels = [s["display_label"] for s in slots]
    no_reversed = all(
        lbl.split("\u2013")[0] < lbl.split("\u2013")[1] for lbl in labels
    )
    slot0 = slots[0] if slots else {}
    start_iso = slot0.get("start_iso", "")
    start_ends_z = start_iso.endswith("Z")
    slot0_score = slot0.get("score", 0)
    return {
        "slot_count":            len(slots),
        "first_label":           labels[0] if labels else None,
        "last_label":            labels[-1] if labels else None,
        "no_reversed_intervals": no_reversed,
        "start_iso_ends_z":      start_ends_z,
        "slot0_start_iso":       start_iso,
        "slot0_score":           slot0_score,
        "day_score":             result.get("day_score"),
        "slots":                 slots,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
