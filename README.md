# X Company Affiliates Finder

A beautiful Cloudflare Worker that helps you discover colleagues and team members from your organization on X (Twitter).

![Screenshot](https://img.shields.io/badge/built%20with-Cloudflare%20Workers-orange)
![OAuth](https://img.shields.io/badge/auth-OAuth%202.0-blue)

## Features

- 🔐 **Secure OAuth 2.0 Authentication** - Uses X's OAuth 2.0 with PKCE for secure authentication
- 🏢 **Company Affiliation Discovery** - Automatically finds your company affiliation
- 👥 **Team Member Listing** - Displays all affiliated users with profiles, stats, and bios
- 🎨 **Beautiful UI** - Modern, responsive design that works on all devices
- ⚡ **Fast & Serverless** - Powered by Cloudflare Workers for instant global deployment

## How It Works

1. **User logs in** with their X account using OAuth 2.0
2. **Worker fetches** the user's affiliation from X API (`GET /2/users/me`)
3. **Worker retrieves** all users affiliated with the same organization (`GET /2/users/{id}/affiliates`)
4. **Dashboard displays** all team members with their profiles and stats

## Setup

### Prerequisites

- A Cloudflare account
- An X Developer account with OAuth 2.0 app created
- Node.js and npm installed

### Step 1: Create X OAuth App

1. Go to [X Developer Portal](https://developer.x.com)
2. Create a new app or select an existing one
3. Navigate to "User authentication settings"
4. Set the following:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URLs**: Add your callback URLs:
     - `http://localhost:8787/callback` (for development)
     - `https://your-worker.workers.dev/callback` (for production)
   - **Website URL**: Your website
5. Save your **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

1. Copy `.dev.vars.example` to `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Fill in your X OAuth credentials:
   ```env
   X_CLIENT_ID=your_client_id_here
   X_CLIENT_SECRET=your_client_secret_here
   X_REDIRECT_URI=http://localhost:8787/callback
   CALLBACK_REDIRECT_URI=/dashboard
   ```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Locally

```bash
npm run dev
```

Visit `http://localhost:8787` to test locally.

### Step 5: Deploy to Cloudflare

1. Set your secrets in Cloudflare:
   ```bash
   wrangler secret put X_CLIENT_ID
   wrangler secret put X_CLIENT_SECRET
   ```

2. Update `wrangler.toml` with your production settings:
   ```toml
   vars = { 
     X_REDIRECT_URI = "https://your-worker.workers.dev/callback",
     CALLBACK_REDIRECT_URI = "/dashboard"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

## API Endpoints Used

This worker uses the following X API v2 endpoints:

- **`GET /2/users/me`** - Retrieves authenticated user details including affiliation
  - Requires: `users.read`, `tweet.read` scopes
  - Fields requested: `affiliation`, `profile_image_url`, `description`, `public_metrics`
  
- **`GET /2/users/{id}/affiliates`** - Retrieves all users affiliated with an organization
  - Requires: `users.read`, `tweet.read` scopes (or Bearer Token)
  - Supports pagination up to 1000 results per request

## Rate Limits

Be aware of X API rate limits:

- **`GET /2/users/me`**: 75 requests per 15 minutes per user (OAuth 2.0)
- **`GET /2/users/{id}/affiliates`**: Rate limits vary by access level

On the **Free tier**, rate limits are very low. Consider upgrading for production use.

## Project Structure

```
.
├── worker.ts                 # Main worker logic
├── simplerauth-x.ts         # OAuth middleware (from simplerauth)
├── wrangler.toml            # Cloudflare Workers configuration
├── package.json             # Dependencies
├── .dev.vars.example        # Example environment variables
└── README.md                # This file
```

## Customization

### Styling

The UI uses inline CSS for simplicity. You can customize colors, fonts, and layouts by editing the styles in the `render*()` functions in `worker.ts`.

### Features

You can extend the worker to:
- Cache affiliate data using Cloudflare KV
- Add search/filter functionality
- Export affiliate lists
- Show more detailed analytics
- Integrate with other APIs

## Troubleshooting

### "No company affiliation found"

This means your X profile doesn't have a company affiliation set up. The affiliation feature is typically used for verified organizations and their employees. Contact your organization's X administrator.

### Authentication errors

- Verify your Client ID and Client Secret are correct
- Check that your callback URL matches exactly (including protocol)
- Ensure your app has the correct permissions (`users.read`, `tweet.read`)

### Rate limit errors

The X API Free tier has very low rate limits. If you're hitting limits:
- Cache results using Cloudflare KV
- Implement request throttling
- Consider upgrading your X API access level

## Credits

Built with:
- [simplerauth](https://github.com/janwilmake/simplerauth) - OAuth middleware
- [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless platform
- [X API v2](https://developer.x.com/en/docs/twitter-api) - Twitter/X API

## License

MIT License - feel free to use this in your own projects!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ by the community