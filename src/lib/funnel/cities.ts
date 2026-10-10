/**
 * Instant type-ahead for the birth-place step. The biggest cities resolve locally on the
 * first keystrokes (no network, no "Find" button); anything else falls through to the
 * existing /api/geocode search after a pause in typing. Coordinates are city centres to
 * two decimals (~1 km), which is well inside what a birth chart needs.
 */

export interface Place {
  name: string;
  region: string;
  lat: number;
  lng: number;
}

// [name, region, lat, lng]
const RAW: [string, string, number, number][] = [
  ['Mumbai', 'Maharashtra, India', 19.08, 72.88],
  ['Delhi', 'Delhi, India', 28.70, 77.10],
  ['New Delhi', 'Delhi, India', 28.61, 77.21],
  ['Bengaluru', 'Karnataka, India', 12.97, 77.59],
  ['Kolkata', 'West Bengal, India', 22.57, 88.36],
  ['Chennai', 'Tamil Nadu, India', 13.08, 80.27],
  ['Hyderabad', 'Telangana, India', 17.39, 78.49],
  ['Ahmedabad', 'Gujarat, India', 23.02, 72.57],
  ['Pune', 'Maharashtra, India', 18.52, 73.86],
  ['Surat', 'Gujarat, India', 21.17, 72.83],
  ['Jaipur', 'Rajasthan, India', 26.91, 75.79],
  ['Lucknow', 'Uttar Pradesh, India', 26.85, 80.95],
  ['Kanpur', 'Uttar Pradesh, India', 26.45, 80.33],
  ['Nagpur', 'Maharashtra, India', 21.15, 79.09],
  ['Indore', 'Madhya Pradesh, India', 22.72, 75.86],
  ['Bhopal', 'Madhya Pradesh, India', 23.26, 77.41],
  ['Thane', 'Maharashtra, India', 19.22, 72.98],
  ['Patna', 'Bihar, India', 25.59, 85.14],
  ['Vadodara', 'Gujarat, India', 22.31, 73.18],
  ['Ghaziabad', 'Uttar Pradesh, India', 28.67, 77.45],
  ['Ludhiana', 'Punjab, India', 30.90, 75.86],
  ['Agra', 'Uttar Pradesh, India', 27.18, 78.01],
  ['Nashik', 'Maharashtra, India', 20.00, 73.79],
  ['Faridabad', 'Haryana, India', 28.41, 77.32],
  ['Meerut', 'Uttar Pradesh, India', 28.98, 77.71],
  ['Rajkot', 'Gujarat, India', 22.30, 70.80],
  ['Varanasi', 'Uttar Pradesh, India', 25.32, 82.97],
  ['Srinagar', 'Jammu and Kashmir, India', 34.08, 74.80],
  ['Aurangabad', 'Maharashtra, India', 19.88, 75.34],
  ['Dhanbad', 'Jharkhand, India', 23.80, 86.43],
  ['Amritsar', 'Punjab, India', 31.63, 74.87],
  ['Prayagraj', 'Uttar Pradesh, India', 25.44, 81.85],
  ['Allahabad', 'Uttar Pradesh, India', 25.44, 81.85],
  ['Ranchi', 'Jharkhand, India', 23.34, 85.31],
  ['Howrah', 'West Bengal, India', 22.60, 88.26],
  ['Coimbatore', 'Tamil Nadu, India', 11.02, 76.96],
  ['Jabalpur', 'Madhya Pradesh, India', 23.18, 79.99],
  ['Gwalior', 'Madhya Pradesh, India', 26.22, 78.18],
  ['Vijayawada', 'Andhra Pradesh, India', 16.51, 80.65],
  ['Jodhpur', 'Rajasthan, India', 26.24, 73.02],
  ['Madurai', 'Tamil Nadu, India', 9.93, 78.12],
  ['Raipur', 'Chhattisgarh, India', 21.25, 81.63],
  ['Kota', 'Rajasthan, India', 25.21, 75.86],
  ['Guwahati', 'Assam, India', 26.14, 91.74],
  ['Chandigarh', 'Chandigarh, India', 30.73, 76.78],
  ['Solapur', 'Maharashtra, India', 17.66, 75.91],
  ['Bareilly', 'Uttar Pradesh, India', 28.37, 79.43],
  ['Moradabad', 'Uttar Pradesh, India', 28.84, 78.77],
  ['Mysuru', 'Karnataka, India', 12.30, 76.64],
  ['Mysore', 'Karnataka, India', 12.30, 76.64],
  ['Gurugram', 'Haryana, India', 28.46, 77.03],
  ['Gurgaon', 'Haryana, India', 28.46, 77.03],
  ['Aligarh', 'Uttar Pradesh, India', 27.88, 78.08],
  ['Jalandhar', 'Punjab, India', 31.33, 75.58],
  ['Tiruchirappalli', 'Tamil Nadu, India', 10.79, 78.70],
  ['Bhubaneswar', 'Odisha, India', 20.30, 85.82],
  ['Salem', 'Tamil Nadu, India', 11.66, 78.15],
  ['Thiruvananthapuram', 'Kerala, India', 8.52, 76.94],
  ['Bhiwandi', 'Maharashtra, India', 19.30, 73.06],
  ['Saharanpur', 'Uttar Pradesh, India', 29.96, 77.55],
  ['Gorakhpur', 'Uttar Pradesh, India', 26.76, 83.37],
  ['Guntur', 'Andhra Pradesh, India', 16.31, 80.44],
  ['Bikaner', 'Rajasthan, India', 28.02, 73.31],
  ['Amravati', 'Maharashtra, India', 20.93, 77.75],
  ['Noida', 'Uttar Pradesh, India', 28.54, 77.39],
  ['Jamshedpur', 'Jharkhand, India', 22.80, 86.20],
  ['Bhilai', 'Chhattisgarh, India', 21.19, 81.38],
  ['Cuttack', 'Odisha, India', 20.46, 85.88],
  ['Kochi', 'Kerala, India', 9.93, 76.27],
  ['Udaipur', 'Rajasthan, India', 24.59, 73.71],
  ['Bhavnagar', 'Gujarat, India', 21.76, 72.15],
  ['Dehradun', 'Uttarakhand, India', 30.32, 78.03],
  ['Asansol', 'West Bengal, India', 23.68, 86.98],
  ['Nanded', 'Maharashtra, India', 19.14, 77.32],
  ['Kolhapur', 'Maharashtra, India', 16.70, 74.24],
  ['Ajmer', 'Rajasthan, India', 26.45, 74.64],
  ['Jamnagar', 'Gujarat, India', 22.47, 70.06],
  ['Ujjain', 'Madhya Pradesh, India', 23.18, 75.78],
  ['Siliguri', 'West Bengal, India', 26.73, 88.40],
  ['Jhansi', 'Uttar Pradesh, India', 25.45, 78.57],
  ['Jammu', 'Jammu and Kashmir, India', 32.73, 74.86],
  ['Mangaluru', 'Karnataka, India', 12.91, 74.86],
  ['Belagavi', 'Karnataka, India', 15.85, 74.50],
  ['Tirunelveli', 'Tamil Nadu, India', 8.71, 77.76],
  ['Gaya', 'Bihar, India', 24.79, 85.00],
  ['Udupi', 'Karnataka, India', 13.34, 74.75],
  ['Kozhikode', 'Kerala, India', 11.26, 75.78],
  ['Thrissur', 'Kerala, India', 10.53, 76.21],
  ['Visakhapatnam', 'Andhra Pradesh, India', 17.69, 83.22],
  ['Tirupati', 'Andhra Pradesh, India', 13.63, 79.42],
  ['Warangal', 'Telangana, India', 17.97, 79.59],
  ['Puducherry', 'Puducherry, India', 11.94, 79.81],
  ['Panaji', 'Goa, India', 15.49, 73.83],
  ['Shimla', 'Himachal Pradesh, India', 31.10, 77.17],
  ['Haridwar', 'Uttarakhand, India', 29.95, 78.16],
  ['Rishikesh', 'Uttarakhand, India', 30.09, 78.27],
  ['Mathura', 'Uttar Pradesh, India', 27.49, 77.67],
  ['Ayodhya', 'Uttar Pradesh, India', 26.80, 82.20],
  ['Muzaffarpur', 'Bihar, India', 26.12, 85.39],
  ['Bhagalpur', 'Bihar, India', 25.24, 86.98],
  ['Darbhanga', 'Bihar, India', 26.15, 85.90],
  ['Patiala', 'Punjab, India', 30.34, 76.39],
  ['Rohtak', 'Haryana, India', 28.90, 76.61],
  ['Hisar', 'Haryana, India', 29.15, 75.72],
  ['Panipat', 'Haryana, India', 29.39, 76.97],
  ['Karnal', 'Haryana, India', 29.69, 76.99],
  ['Sagar', 'Madhya Pradesh, India', 23.84, 78.74],
  ['Rewa', 'Madhya Pradesh, India', 24.53, 81.30],
  ['Bilaspur', 'Chhattisgarh, India', 22.08, 82.15],
  ['Silchar', 'Assam, India', 24.83, 92.78],
  ['Imphal', 'Manipur, India', 24.82, 93.94],
  ['Shillong', 'Meghalaya, India', 25.58, 91.89],
  ['Agartala', 'Tripura, India', 23.83, 91.29],
  ['Gangtok', 'Sikkim, India', 27.33, 88.61],
  ['Kathmandu', 'Nepal', 27.72, 85.32],
  ['Dhaka', 'Bangladesh', 23.81, 90.41],
  ['Colombo', 'Sri Lanka', 6.93, 79.86],
  ['Karachi', 'Pakistan', 24.86, 67.01],
  ['Lahore', 'Pakistan', 31.55, 74.34],
  ['Dubai', 'United Arab Emirates', 25.20, 55.27],
  ['Abu Dhabi', 'United Arab Emirates', 24.45, 54.38],
  ['Sharjah', 'United Arab Emirates', 25.35, 55.39],
  ['Doha', 'Qatar', 25.29, 51.53],
  ['Muscat', 'Oman', 23.59, 58.41],
  ['Riyadh', 'Saudi Arabia', 24.71, 46.68],
  ['Jeddah', 'Saudi Arabia', 21.49, 39.19],
  ['Kuwait City', 'Kuwait', 29.38, 47.99],
  ['Manama', 'Bahrain', 26.23, 50.59],
  ['Singapore', 'Singapore', 1.35, 103.82],
  ['Kuala Lumpur', 'Malaysia', 3.14, 101.69],
  ['London', 'United Kingdom', 51.51, -0.13],
  ['Birmingham', 'United Kingdom', 52.49, -1.89],
  ['Leicester', 'United Kingdom', 52.64, -1.13],
  ['Manchester', 'United Kingdom', 53.48, -2.24],
  ['New York', 'United States', 40.71, -74.01],
  ['San Francisco', 'United States', 37.77, -122.42],
  ['San Jose', 'United States', 37.34, -121.89],
  ['Los Angeles', 'United States', 34.05, -118.24],
  ['Chicago', 'United States', 41.88, -87.63],
  ['Houston', 'United States', 29.76, -95.37],
  ['Dallas', 'United States', 32.78, -96.80],
  ['Seattle', 'United States', 47.61, -122.33],
  ['Toronto', 'Canada', 43.65, -79.38],
  ['Vancouver', 'Canada', 49.28, -123.12],
  ['Sydney', 'Australia', -33.87, 151.21],
  ['Melbourne', 'Australia', -37.81, 144.96],
  ['Auckland', 'New Zealand', -36.85, 174.76],
  ['Nairobi', 'Kenya', -1.29, 36.82],
  ['Johannesburg', 'South Africa', -26.20, 28.05],
  ['Durban', 'South Africa', -29.86, 31.02],
];

export const CITIES: Place[] = RAW.map(([name, region, lat, lng]) => ({ name, region, lat, lng }));

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').trim();
}

/** Local prefix matches first, then word-start matches; at most `limit`. */
export function matchCities(query: string, limit = 6): Place[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const starts = CITIES.filter((c) => norm(c.name).startsWith(q));
  const words = CITIES.filter((c) => !starts.includes(c) && norm(`${c.name} ${c.region}`).split(' ').some((w) => w.startsWith(q)));
  return starts.concat(words).slice(0, limit);
}

/**
 * "Jaipur, Jaipur Municipal Corporation, Jaipur Tehsil, Jaipur, Rajasthan, 302001, India"
 * → name "Jaipur", region "Rajasthan, India". Postcodes dropped. (Same rule as /start.)
 */
export function placeFromGeocode(display: string, lat: number, lng: number): Place {
  const parts = display
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !/^\d[\d\s-]*$/.test(p));
  const name = parts[0] ?? display;
  const region = parts.length >= 3 ? `${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : parts.slice(1).join(', ');
  return { name, region, lat, lng };
}

export function placeLabel(p: Place): string {
  return p.region ? `${p.name}, ${p.region}` : p.name;
}
