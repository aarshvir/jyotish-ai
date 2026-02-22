export interface BirthData {
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  timezone: string;
  name?: string;
}

export interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  nakshatra: string;
  pada: number;
}

export interface ChartData {
  planets: PlanetPosition[];
  ascendant: PlanetPosition;
  houses: number[];
}

export const zodiacSigns = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

export const nakshatras = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

export function getSignFromLongitude(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  return zodiacSigns[signIndex % 12];
}

export function getNakshatraFromLongitude(longitude: number): { name: string; pada: number } {
  const nakshatraIndex = Math.floor(longitude / 13.333333);
  const pada = Math.floor((longitude % 13.333333) / 3.333333) + 1;
  return {
    name: nakshatras[nakshatraIndex % 27],
    pada
  };
}
