import requests
import json

# Test the deployed service
BASE_URL = "https://jyotish-ai-feb-26-production.up.railway.app"

print("=" * 70)
print("Testing Vedic Astrology Ephemeris Service")
print("=" * 70)

# Test 1: Health check
print("\n[1/2] Testing health endpoint...")
try:
    response = requests.get(f"{BASE_URL}/", timeout=10)
    if response.status_code == 200:
        print(f"SUCCESS: {response.json()}")
    else:
        print(f"FAILED: Status {response.status_code}")
except Exception as e:
    print(f"ERROR: {e}")

# Test 2: Natal chart
print("\n[2/2] Testing natal chart endpoint...")
test_data = {
    "birth_date": "1991-01-05",
    "birth_time": "19:45:00",
    "birth_city": "Lucknow, India",
    "birth_lat": 26.8467,
    "birth_lng": 80.9462
}

try:
    response = requests.post(f"{BASE_URL}/natal-chart", json=test_data, timeout=30)
    if response.status_code == 200:
        result = response.json()
        print("SUCCESS!")
        print(f"\nLagna: {result['lagna']}")
        print(f"Moon Sign: {result['planets']['Moon']['sign']}")
        print(f"Moon Nakshatra: {result['moon_nakshatra']}")
        print(f"Current Mahadasha: {result['current_dasha']['mahadasha']}")
        print(f"Current Antardasha: {result['current_dasha']['antardasha']}")
        
        # Save full result
        with open('deployment_test_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        print("\nFull result saved to: deployment_test_result.json")
    else:
        print(f"FAILED: Status {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 70)
print("Service URL: " + BASE_URL)
print("API Docs: " + BASE_URL + "/docs")
print("=" * 70)
