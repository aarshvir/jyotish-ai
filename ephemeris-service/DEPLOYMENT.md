# Railway Deployment Guide

## Quick Start - Deploy in 5 Minutes

### Step 1: Install Railway CLI

**Windows (PowerShell - Run as Administrator):**
```powershell
iwr https://railway.app/install.ps1 | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://railway.app/install.sh | sh
```

### Step 2: Login to Railway
```bash
railway login
```
This will open your browser to authenticate with Railway.

### Step 3: Navigate to Service Directory
```bash
cd ephemeris-service
```

### Step 4: Initialize Railway Project
```bash
railway init
```
- Choose: **"Create new project"**
- Enter project name: **jyotish-ephemeris** (or your preferred name)

### Step 5: Deploy
```bash
railway up
```
This will:
- Build the Docker image
- Deploy to Railway
- Provide a deployment URL

### Step 6: Generate Public URL
```bash
railway domain
```
This generates a public HTTPS URL like: `https://jyotish-ephemeris.up.railway.app`

### Step 7: Test Your Deployment
```bash
curl https://your-railway-url.railway.app/
```

You should see:
```json
{
  "message": "Vedic Astrology Ephemeris Service",
  "version": "1.0"
}
```

## Viewing Your Deployment

### Check Deployment Status
```bash
railway status
```

### View Real-time Logs
```bash
railway logs
```

### Open in Browser
```bash
railway open
```

## Alternative: Deploy via Railway Dashboard

1. **Go to Railway Dashboard**: https://railway.app/new
2. **Click "Deploy from GitHub repo"**
3. **Connect your GitHub account** (if not already connected)
4. **Select your repository**
5. **Railway auto-detects the Dockerfile** and deploys
6. **Get your URL** from the Railway dashboard

## Testing Your Deployed Service

Once deployed, test with the natal chart endpoint:

```bash
curl -X POST https://your-railway-url.railway.app/natal-chart \
  -H "Content-Type: application/json" \
  -d '{
    "birth_date": "1991-01-05",
    "birth_time": "19:45:00",
    "birth_city": "Lucknow, India",
    "birth_lat": 26.8467,
    "birth_lng": 80.9462
  }'
```

Or visit the interactive API docs:
- **Swagger UI**: `https://your-railway-url.railway.app/docs`
- **ReDoc**: `https://your-railway-url.railway.app/redoc`

## Managing Your Deployment

### Update Your Service
After making code changes:
```bash
railway up
```

### View Environment Variables
```bash
railway variables
```

### Set Environment Variables (if needed)
```bash
railway variables set KEY=VALUE
```

### Delete Project
```bash
railway delete
```

## Troubleshooting

### Issue: "railway: command not found"
**Solution**: Restart your terminal after installing Railway CLI

### Issue: Build fails
**Solution**: Check logs with `railway logs` and verify Dockerfile syntax

### Issue: Service returns 502/503
**Solution**: 
1. Check logs: `railway logs`
2. Verify the PORT environment variable is being used
3. Ensure the service is listening on `0.0.0.0` not `localhost`

### Issue: Swiss Ephemeris calculation errors
**Solution**: The Docker image includes all necessary ephemeris files. If errors persist, check the date/time format in your requests.

## Cost Information

Railway offers:
- **$5 free credit per month** for hobby plan
- **Pay-as-you-go** after free credit
- Typical cost for this service: **~$5-10/month** depending on usage

## Next Steps

1. **Set up custom domain** (optional):
   ```bash
   railway domain add yourdomain.com
   ```

2. **Enable monitoring**: Railway provides built-in metrics in the dashboard

3. **Set up CI/CD**: Connect to GitHub for automatic deployments on push

4. **Scale**: Railway auto-scales based on traffic

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app
