from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder
import swisseph as swe
import math
import traceback

app = FastAPI(title="Vedic Astrology Ephemeris Service")

# Set Lahiri ayanamsa for all calculations
swe.set_sid_mode(swe.SIDM_LAHIRI)

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


def calculate_houses(jd: float, lat: float, lng: float) -> List[float]:
    """Calculate sidereal house cusps using Placidus system"""
    houses = swe.houses(jd, lat, lng, b'P')
    # swe.houses() returns tropical cusps; subtract ayanamsa for sidereal Lagna
    ayanamsa = swe.get_ayanamsa_ut(jd)
    sidereal_cusps = tuple((c - ayanamsa) % 360 for c in houses[0])
    return sidereal_cusps


def get_house_number(planet_long: float, house_cusps: List[float]) -> int:
    """Determine which house a planet is in"""
    for i in range(12):
        cusp_start = house_cusps[i]
        cusp_end = house_cusps[(i + 1) % 12]
        
        if cusp_end < cusp_start:
            if planet_long >= cusp_start or planet_long < cusp_end:
                return i + 1
        else:
            if cusp_start <= planet_long < cusp_end:
                return i + 1
    return 1


def calculate_vimshottari_dasha(moon_longitude: float, birth_date: datetime) -> List[Dict]:
    """Calculate Vimshottari Dasha sequence using Moon's sidereal longitude for proper balance"""
    NAK_SPAN = 360.0 / 27  # 13°20' per nakshatra

    nakshatra_num = int(moon_longitude / NAK_SPAN)
    fraction_elapsed = (moon_longitude % NAK_SPAN) / NAK_SPAN

    start_planet_idx = nakshatra_num % 9
    first_planet = DASHA_SEQUENCE[start_planet_idx]

    # First dasha began before birth; calculate its actual start date
    first_dasha_start = birth_date - timedelta(days=fraction_elapsed * DASHA_YEARS[first_planet] * 365.25)

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
        # Keep local datetime for dasha start reference (calendar date of birth)
        birth_datetime = datetime.strptime(f"{data.birth_date} {data.birth_time}", "%Y-%m-%d %H:%M:%S")
        
        # Calculate house cusps
        house_cusps = calculate_houses(jd, data.birth_lat, data.birth_lng)
        
        # Calculate Lagna (Ascendant)
        lagna_long = house_cusps[0]
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
            house = get_house_number(pos["longitude"], house_cusps)

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
        ketu_house = get_house_number(ketu_long, house_cusps)
        
        planets["Ketu"] = {
            "sign": SIGNS[ketu_sign_num],
            "degree": round(ketu_degree, 4),
            "nakshatra": NAKSHATRAS[ketu_nakshatra_num],
            "nakshatra_pada": ketu_nakshatra_pada,
            "is_retrograde": False,
            "house": ketu_house
        }
        
        # Calculate Vimshottari Dasha using moon longitude for correct balance
        dasha_sequence = calculate_vimshottari_dasha(moon_longitude, birth_datetime)
        current_dasha = get_current_dasha(dasha_sequence, datetime.now())
        
        return {
            "lagna": SIGNS[lagna_sign_num],
            "lagna_degree": round(lagna_degree, 4),
            "planets": planets,
            "moon_nakshatra": planets["Moon"]["nakshatra"],
            "dasha_sequence": dasha_sequence,
            "current_dasha": current_dasha
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
# Slot scoring (mirrors RatingAgent formula; used when Python builds slots)
# ---------------------------------------------------------------------------

HORA_MODIFIERS = {
    "Aries":       {"Saturn": 15, "Sun": 8, "Jupiter": 6, "Mars": 3, "Mercury": -8, "Venus": -6, "Moon": -3},
    "Taurus":      {"Saturn": 15, "Mercury": 8, "Venus": 6, "Moon": 3, "Jupiter": -8, "Mars": -6, "Sun": -3},
    "Gemini":      {"Venus": 15, "Mercury": 8, "Saturn": 6, "Sun": 3, "Moon": -8, "Jupiter": -6, "Mars": -3},
    "Cancer":      {"Moon": 18, "Mars": 18, "Jupiter": 5, "Sun": 2, "Venus": -3, "Mercury": -8, "Saturn": -12},
    "Leo":         {"Mars": 15, "Sun": 10, "Jupiter": 6, "Saturn": 3, "Mercury": -8, "Venus": -6, "Moon": -3},
    "Virgo":       {"Venus": 15, "Mercury": 10, "Saturn": 6, "Moon": 3, "Jupiter": -8, "Mars": -6, "Sun": -3},
    "Libra":       {"Saturn": 15, "Mercury": 8, "Venus": 8, "Moon": 3, "Mars": -8, "Jupiter": -6, "Sun": -3},
    "Scorpio":     {"Moon": 15, "Mars": 10, "Jupiter": 6, "Sun": 3, "Venus": -8, "Mercury": -6, "Saturn": -3},
    "Sagittarius": {"Mars": 15, "Jupiter": 10, "Sun": 6, "Saturn": 3, "Venus": -8, "Mercury": -6, "Moon": -3},
    "Capricorn":   {"Venus": 15, "Saturn": 10, "Mercury": 6, "Moon": 3, "Mars": -8, "Jupiter": -6, "Sun": -3},
    "Aquarius":    {"Venus": 15, "Saturn": 10, "Mercury": 6, "Moon": 3, "Mars": -8, "Jupiter": -6, "Sun": -3},
    "Pisces":      {"Moon": 15, "Jupiter": 10, "Mars": 6, "Sun": 3, "Saturn": -8, "Mercury": -6, "Venus": -3},
}

CHOGHADIYA_MODIFIERS = {
    "Amrit": 18, "Shubh": 12, "Labh": 10, "Char": 4, "Chal": 4,
    "Udveg": -5, "Rog": -10, "Kaal": -18,
}

TRANSIT_HOUSE_MODIFIERS = {
    1: 6, 2: 2, 3: -2, 4: 1, 5: 3, 6: -4, 7: 0, 8: -8,
    9: 5, 10: 6, 11: 4, 12: -8,
}

# Day-level modifiers for score variance (grandmaster range 39-80)
YOGA_MODIFIERS = {
    'Amrita': 18, 'Sarvartha_Siddhi': 18,
    'Brahma': 16, 'Siddha': 14, 'Indra': 13,
    'Shubha': 9,  'Subha': 9,  'Sadhya': 7,
    'Shobhana': 7, 'Shubhakrit': 7,
    'Vriddhi': 6, 'Siddhi': 5, 'Dhruva': 5,
    'Harshana': 10, 'Vajra': 4, 'Sukarma': 2,
    'Priti': 3, 'Variyan': 2, 'Sukla': 2,
    'Saubhagya': 8, 'Ayushman': 5,
    'Shiva': 4, 'Dhriti': 3,
    'Ganda': -6, 'Atiganda': -18, 'Shoola': -8,
    'Vishkambha': -12, 'Vaidhriti': -12,
    'Parigha': -14, 'Vyatipata': -14,
    'Vyaghata': -8, 'Shula': -8,
}

YOGA_SCORE_MODIFIERS = {
    "Siddhi": 8, "Shiva": 6, "Brahma": 6, "Indra": 5, "Amrit": 8,
    "Harshana": 4, "Vriddhi": 5, "Dhruva": 4, "Shubha": 4, "Priti": 5,
    "Saubhagya": 5, "Vishkambha": -8, "Atiganda": -10, "Ganda": -7,
    "Vyaghata": -7, "Vyatipata": -12, "Vaidhriti": -10, "Parigha": -6,
    "Shula": -5,
}

SUN_HOUSE_MONTHLY_BONUS = {
    1: 6, 2: 2, 3: -2, 4: 4, 5: 8, 6: -4,
    7: 2, 8: -10, 9: -4, 10: 12, 11: 6, 12: -8,
}

MARS_HOUSE_MONTHLY_BONUS = {
    1: 8, 4: 6, 5: 10, 7: 4, 9: 8, 10: 10,
    6: -4, 8: -10, 12: -6,
}

MOON_HOUSE_MODIFIERS = {
    1: 6,  2: 2,  3: -2, 4: 5,  5: 10,
    6: -7, 7: 2,  8: -10, 9: 9, 10: 7,
    11: 11, 12: -9
}

TITHI_MODIFIERS = {
    'Amavasya': -8,
    'Krishna Ashtami': -2,
    'Krishna Chaturthi': -1,
    'Krishna Dashami': 1,
    'Krishna Dwadashi': 2,
    'Krishna Dwitiya': 1,
    'Krishna Ekadashi': 3,
    'Krishna Navami': -1,
    'Krishna Panchami': 1,
    'Krishna Pratipada': 1,
    'Krishna Purnima/Amavasya': -3,
    'Krishna Saptami': 1,
    'Krishna Shashthi': 1,
    'Krishna Trayodashi': -2,
    'Krishna Tritiya': 2,
    'Purnima': 0,
    'Purnima (Full Moon)': 0,
    'Purnima/Amavasya': -3,
    'Shukla Ashtami': 1,
    'Shukla Chaturthi': -1,
    'Shukla Dashami': 2,
    'Shukla Dwadashi': 3,
    'Shukla Dwitiya': 2,
    'Shukla Ekadashi': 4,
    'Shukla Navami': 2,
    'Shukla Panchami': 2,
    'Shukla Pratipada': 1,
    'Shukla Saptami': 2,
    'Shukla Shashthi': 2,
    'Shukla Trayodashi': 2,
    'Shukla Tritiya': 3,
}

WEEKDAY_MODIFIERS = {
    0: 5, 1: 2, 2: -2, 3: 8,
    4: -3, 5: -4, 6: 2
}

SIGN_INDEX = {
    "Aries": 0, "Taurus": 1, "Gemini": 2, "Cancer": 3, "Leo": 4, "Virgo": 5,
    "Libra": 6, "Scorpio": 7, "Sagittarius": 8, "Capricorn": 9,
    "Aquarius": 10, "Pisces": 11,
}


def calculate_slot_score(
    dominant_hora,
    dominant_choghadiya,
    transit_lagna_house,
    is_rahu_kaal,
    natal_lagna_sign,
    yoga=None,
    moon_house=None,
    tithi=None,
    weekday=None,
):
    base = 55

    hora_mod = HORA_MODIFIERS.get(natal_lagna_sign, {}).get(dominant_hora, 0)
    chog_mod = CHOGHADIYA_MODIFIERS.get(dominant_choghadiya, 0)
    if chog_mod == 0 and dominant_choghadiya == "Char":
        chog_mod = CHOGHADIYA_MODIFIERS.get("Chal", 0)
    house_mod = TRANSIT_HOUSE_MODIFIERS.get(transit_lagna_house, 0)
    rahu_mod = -20 if is_rahu_kaal else 0

    yoga_mod = YOGA_MODIFIERS.get(yoga, 0) if yoga else 0
    yoga_name_mod = YOGA_SCORE_MODIFIERS.get(yoga, 0) if yoga else 0

    moon_house_mod = MOON_HOUSE_MODIFIERS.get(moon_house, 0) if moon_house else 0

    tithi_mod = 0
    if tithi:
        tithi_mod = TITHI_MODIFIERS.get(tithi, 0)
        if tithi_mod == 0:
            clean = tithi.split('\u2192')[0].strip()
            for k, v in TITHI_MODIFIERS.items():
                if clean.startswith(k) or k.startswith(clean):
                    tithi_mod = v
                    break

    weekday_mod = WEEKDAY_MODIFIERS.get(weekday, 0) if weekday is not None else 0

    # Separate day-level and slot-level modifiers
    slot_mods = hora_mod + chog_mod + house_mod + rahu_mod

    day_mods_raw = (yoga_mod + yoga_name_mod + moon_house_mod +
                    tithi_mod + weekday_mod)

    # Only floor negatives — no cap on positives
    # Strong yoga days must be able to reach 70-80
    if day_mods_raw < 0:
        day_mods = max(day_mods_raw, -20)
    else:
        day_mods = day_mods_raw

    raw = base + slot_mods + day_mods

    if is_rahu_kaal:
        raw = min(raw, 48)

    return max(0, min(100, raw))


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

        # Day-level vars (yoga, tithi, moon_house, weekday) computed once before slot loop.
        sun_pos = get_planet_position(sunrise_jd, swe.SUN)
        moon_pos = get_planet_position(sunrise_jd, swe.MOON)
        tithi_str = calculate_tithi(sun_pos["longitude"], moon_pos["longitude"])
        yoga_str = calculate_yoga(sun_pos["longitude"], moon_pos["longitude"])
        moon_sign = moon_pos["sign"]
        lagna_idx = SIGN_INDEX.get(natal_lagna_sign, 0)
        moon_idx = SIGN_INDEX.get(moon_sign, 0)
        moon_house = (moon_idx - lagna_idx) % 12 + 1
        weekday = date_obj.weekday()

        # Day-level debug print (computed once before slot scoring loop).
        target_date = date_obj
        yoga = yoga_str
        tithi = tithi_str
        tithi_mod = 0
        if tithi:
            tithi_mod = TITHI_MODIFIERS.get(tithi, 0)
            if tithi_mod == 0:
                clean = tithi.split('→')[0].strip()
                for k, v in TITHI_MODIFIERS.items():
                    if clean.startswith(k) or k.startswith(clean):
                        tithi_mod = v
                        break
        print(
            f"[DAY-LEVEL] date={target_date} "
            f"yoga={yoga!r} yoga_mod={YOGA_MODIFIERS.get(yoga,0)} "
            f"tithi={tithi!r} tithi_mod={tithi_mod} "
            f"moon_house={moon_house} moon_mod={MOON_HOUSE_MODIFIERS.get(moon_house,0)} "
            f"weekday={weekday} weekday_mod={WEEKDAY_MODIFIERS.get(weekday,0)}"
        )

        print(
            f"[SCORE-DBG] {date_obj} yoga={yoga_str!r} "
            f"tithi={tithi_str!r} moon_house={moon_house} "
            f"weekday={weekday}"
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
            t_cusps = calculate_houses(mid_jd, data.current_lat, data.current_lng)
            t_sign  = int(t_cusps[0] / 30) % 12
            t_house = ((t_sign - natal_sign_idx) % 12) + 1

            score = calculate_slot_score(
                dominant_hora=dom_hora["ruler"],
                dominant_choghadiya=dom_chog["name"],
                transit_lagna_house=t_house,
                is_rahu_kaal=is_rk,
                natal_lagna_sign=natal_lagna_sign,
                yoga=yoga_str,
                moon_house=moon_house,
                tithi=tithi_str,
                weekday=weekday,
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
            "nakshatra": moon_pos["nakshatra"],
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


@app.get("/validate")
def validate_grid():
    """Structural sanity-check using Dubai 2026-02-26, Cancer lagna. Asserts UTC (Z) timestamps and slot 0 score 74."""
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
