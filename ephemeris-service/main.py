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
    """Convert Julian Day to time string"""
    dt = swe.revjul(jd)
    time_dt = datetime(dt[0], dt[1], dt[2], 0, 0, 0) + timedelta(days=dt[3]) + timedelta(hours=timezone_offset)
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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
