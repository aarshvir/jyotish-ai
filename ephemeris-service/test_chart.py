import requests
import json
from datetime import datetime

# Test data
test_data = {
    "birth_date": "1991-01-05",
    "birth_time": "19:45:00",
    "birth_city": "Lucknow, India",
    "birth_lat": 26.8467,
    "birth_lng": 80.9462
}

# Expected results
expected = {
    "lagna": "Cancer",
    "moon_sign": "Leo",
    "moon_nakshatra": "Purva Phalguni",
    "jupiter_sign": "Cancer",
    "current_mahadasha": "Rahu",
    "current_antardasha": "Mercury"
}

print("=" * 70)
print("VEDIC ASTROLOGY NATAL CHART TEST")
print("=" * 70)
print(f"\nTest Data:")
print(f"  Birth Date: {test_data['birth_date']}")
print(f"  Birth Time: {test_data['birth_time']}")
print(f"  Birth Place: {test_data['birth_city']}")
print(f"  Coordinates: {test_data['birth_lat']}, {test_data['birth_lng']}")
print("\n" + "=" * 70)

try:
    # Make API request
    url = "http://localhost:8000/natal-chart"
    print(f"\nCalling API: {url}")
    response = requests.post(url, json=test_data)
    
    if response.status_code != 200:
        print(f"\n❌ ERROR: API returned status code {response.status_code}")
        print(f"Response: {response.text}")
        exit(1)
    
    result = response.json()
    
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    
    # Display full results
    print(f"\n📍 LAGNA (Ascendant)")
    print(f"   Sign: {result['lagna']}")
    print(f"   Degree: {result['lagna_degree']}°")
    
    print(f"\n🌙 MOON")
    print(f"   Sign: {result['planets']['Moon']['sign']}")
    print(f"   Degree: {result['planets']['Moon']['degree']}°")
    print(f"   Nakshatra: {result['planets']['Moon']['nakshatra']}")
    print(f"   Pada: {result['planets']['Moon']['nakshatra_pada']}")
    print(f"   House: {result['planets']['Moon']['house']}")
    
    print(f"\n🪐 PLANETARY POSITIONS")
    for planet_name in ["Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]:
        planet = result['planets'][planet_name]
        retro = " (R)" if planet['is_retrograde'] else ""
        print(f"   {planet_name:8s}: {planet['sign']:12s} {planet['degree']:7.2f}° | "
              f"House {planet['house']} | {planet['nakshatra']}{retro}")
    
    print(f"\n⏳ CURRENT DASHA")
    if result['current_dasha']:
        print(f"   Mahadasha: {result['current_dasha']['mahadasha']}")
        print(f"   Antardasha: {result['current_dasha']['antardasha']}")
        print(f"   Period: {result['current_dasha']['start_date']} to {result['current_dasha']['end_date']}")
    
    # Validation
    print("\n" + "=" * 70)
    print("VALIDATION")
    print("=" * 70)
    
    all_passed = True
    
    # Check Lagna
    print(f"\n✓ Lagna:")
    if result['lagna'] == expected['lagna']:
        print(f"   ✅ PASS - {result['lagna']} (Expected: {expected['lagna']})")
    else:
        print(f"   ❌ FAIL - Got {result['lagna']}, Expected: {expected['lagna']}")
        all_passed = False
    
    # Check Moon sign
    print(f"\n✓ Moon Sign:")
    if result['planets']['Moon']['sign'] == expected['moon_sign']:
        print(f"   ✅ PASS - {result['planets']['Moon']['sign']} (Expected: {expected['moon_sign']})")
    else:
        print(f"   ❌ FAIL - Got {result['planets']['Moon']['sign']}, Expected: {expected['moon_sign']}")
        all_passed = False
    
    # Check Moon nakshatra
    print(f"\n✓ Moon Nakshatra:")
    if result['moon_nakshatra'] == expected['moon_nakshatra']:
        print(f"   ✅ PASS - {result['moon_nakshatra']} (Expected: {expected['moon_nakshatra']})")
    else:
        print(f"   ❌ FAIL - Got {result['moon_nakshatra']}, Expected: {expected['moon_nakshatra']}")
        all_passed = False
    
    # Check Jupiter sign (exalted in Cancer)
    print(f"\n✓ Jupiter Sign:")
    if result['planets']['Jupiter']['sign'] == expected['jupiter_sign']:
        print(f"   ✅ PASS - {result['planets']['Jupiter']['sign']} (Expected: {expected['jupiter_sign']} - Exalted)")
    else:
        print(f"   ❌ FAIL - Got {result['planets']['Jupiter']['sign']}, Expected: {expected['jupiter_sign']}")
        all_passed = False
    
    # Check Current Mahadasha
    print(f"\n✓ Current Mahadasha:")
    if result['current_dasha'] and result['current_dasha']['mahadasha'] == expected['current_mahadasha']:
        print(f"   ✅ PASS - {result['current_dasha']['mahadasha']} (Expected: {expected['current_mahadasha']})")
    else:
        actual = result['current_dasha']['mahadasha'] if result['current_dasha'] else 'None'
        print(f"   ❌ FAIL - Got {actual}, Expected: {expected['current_mahadasha']}")
        all_passed = False
    
    # Check Current Antardasha
    print(f"\n✓ Current Antardasha:")
    if result['current_dasha'] and result['current_dasha']['antardasha'] == expected['current_antardasha']:
        print(f"   ✅ PASS - {result['current_dasha']['antardasha']} (Expected: {expected['current_antardasha']})")
    else:
        actual = result['current_dasha']['antardasha'] if result['current_dasha'] else 'None'
        print(f"   ❌ FAIL - Got {actual}, Expected: {expected['current_antardasha']}")
        all_passed = False
    
    print("\n" + "=" * 70)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
    else:
        print("⚠️  SOME TESTS FAILED - Please review the calculations")
    print("=" * 70)
    
    # Save full output to file
    with open('test_output.json', 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\n💾 Full output saved to: test_output.json")
    
except requests.exceptions.ConnectionError:
    print("\n❌ ERROR: Could not connect to the API")
    print("   Make sure the server is running on http://localhost:8000")
    print("   Start it with: uvicorn main:app --reload")
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
