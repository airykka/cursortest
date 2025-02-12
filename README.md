# Node.js Supabase API

A Node.js backend API that interfaces with Supabase.

## Environment Variables

The following environment variables are required:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

## Deployment Instructions

### Deploying to Render

1. Create a new account on [Render](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Fill in the following details:
   - Name: your-service-name
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add your environment variables in the "Environment" section
6. Click "Create Web Service"

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Run the development server: `npm run dev`
5. Run in production mode: `npm start`

## API Endpoints

When deployed, your endpoints will be available at `api.yourdomain.com/endpoint`:

- `GET /health` - Health check endpoint
- `GET /data` - Fetch data from Supabase names table
