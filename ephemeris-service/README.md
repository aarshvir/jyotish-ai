# Vedic Astrology Ephemeris Microservice

A FastAPI-based microservice for calculating real Vedic astrological data using Swiss Ephemeris.

## Features

- **Natal Chart Calculations**: Complete birth chart with planets, houses, nakshatras, and Vimshottari Dasha
- **Panchang**: Daily tithi, nakshatra, yoga, karana, sunrise/sunset
- **Hora Schedule**: 24-hour planetary hora schedule (Chaldean order)
- **Choghadiya**: Auspicious/inauspicious time periods
- **Rahu Kaal**: Daily inauspicious period
- **Full Day Data**: Combined endpoint for all daily calculations

## API Endpoints

### POST /natal-chart
Calculate complete Vedic birth chart with planetary positions, houses, nakshatras, and dasha periods.

### POST /panchang
Get daily panchang (Hindu calendar) information.

### POST /hora-schedule
Get 24-hour planetary hora schedule.

### POST /choghadiya
Get day and night choghadiya periods.

### POST /rahu-kaal
Get Rahu Kaal timing for the day.

### POST /full-day-data
Get combined panchang, hora, choghadiya, and rahu kaal data.

## Local Development

### Prerequisites
- Python 3.11+
- pip

### Setup

1. Install dependencies:
```bash
cd ephemeris-service
pip install -r requirements.txt
```

2. Run the server:
```bash
uvicorn main:app --reload
```

3. Access the API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Testing

Run the test script to verify natal chart calculations:

```bash
python test_chart.py
```

This tests the service with birth data from January 5, 1991, 19:45 in Lucknow, India.

## Railway Deployment

### Method 1: Deploy from Command Line (Recommended)

1. **Install Railway CLI**:
```bash
# Windows (PowerShell)
iwr https://railway.app/install.ps1 | iex

# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh
```

2. **Login to Railway**:
```bash
railway login
```

3. **Navigate to the service directory**:
```bash
cd ephemeris-service
```

4. **Initialize Railway project**:
```bash
railway init
```
- Choose "Create new project"
- Give it a name like "jyotish-ephemeris"

5. **Deploy**:
```bash
railway up
```

6. **Generate a public domain** (optional):
```bash
railway domain
```

7. **View logs**:
```bash
railway logs
```

8. **Get the deployment URL**:
```bash
railway status
```

### Method 2: Deploy via GitHub

1. **Push code to GitHub**:
```bash
cd ephemeris-service
git init
git add .
git commit -m "Initial commit: Vedic astrology ephemeris service"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Deploy on Railway**:
- Go to https://railway.app
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your repository
- Railway will auto-detect the Dockerfile and deploy

3. **Configure**:
- Railway will automatically use the `railway.toml` configuration
- A public URL will be generated automatically

### Method 3: Deploy via Railway Dashboard

1. Go to https://railway.app/new
2. Click "Empty Project"
3. Click "Deploy from GitHub repo" or "Deploy from local directory"
4. Select the `ephemeris-service` folder
5. Railway will detect the Dockerfile and deploy automatically

## Environment Variables

No environment variables are required for basic operation. The service uses:
- **PORT**: Automatically set by Railway (defaults to 8000 locally)

## Technical Details

### Calculation Methods
- **Ayanamsa**: Lahiri (SIDM_LAHIRI)
- **House System**: Placidus
- **Dasha System**: Vimshottari (120-year cycle)
- **Hora Order**: Chaldean (Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars)
- **Coordinates**: Sidereal zodiac for all planetary positions

### Dependencies
- **FastAPI**: Modern web framework
- **pyswisseph**: Swiss Ephemeris library for astronomical calculations
- **uvicorn**: ASGI server
- **geopy**: Geocoding support
- **timezonefinder**: Timezone detection
- **ephem**: Additional astronomical calculations

## API Usage Examples

### Natal Chart
```bash
curl -X POST http://localhost:8000/natal-chart \
  -H "Content-Type: application/json" \
  -d '{
    "birth_date": "1991-01-05",
    "birth_time": "19:45:00",
    "birth_city": "Lucknow, India",
    "birth_lat": 26.8467,
    "birth_lng": 80.9462
  }'
```

### Panchang
```bash
curl -X POST http://localhost:8000/panchang \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-22",
    "lat": 26.8467,
    "lng": 80.9462,
    "timezone_offset": 5.5
  }'
```

### Full Day Data
```bash
curl -X POST http://localhost:8000/full-day-data \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-02-22",
    "birth_lat": 26.8467,
    "birth_lng": 80.9462,
    "current_lat": 26.8467,
    "current_lng": 80.9462,
    "timezone_offset": 5.5
  }'
```

## Troubleshooting

### Railway Deployment Issues

1. **Build fails**: Check Railway logs with `railway logs`
2. **Service not responding**: Ensure PORT environment variable is used correctly
3. **Swiss Ephemeris errors**: The Docker image includes all necessary ephemeris files

### Local Development Issues

1. **Import errors**: Ensure all dependencies are installed: `pip install -r requirements.txt`
2. **Calculation errors**: Verify date/time formats match ISO 8601 (YYYY-MM-DD, HH:MM:SS)
3. **Timezone issues**: Always provide timezone_offset in hours (e.g., 5.5 for IST)

## License

MIT License - Free for personal and commercial use.

## Support

For issues or questions, please open an issue on the GitHub repository.
