import { Env, middleware } from "./simplerauth-x";

interface AffiliationData {
  badge_url?: string;
  description?: string;
  url?: string;
  user_id?: string[];
}

interface UserData {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  affiliation?: AffiliationData;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

async function getUserAffiliation(
  token: string
): Promise<{ user: UserData; orgUserId: string | null }> {
  const res = await fetch(
    "https://api.x.com/2/users/me?user.fields=affiliation,profile_image_url,description,public_metrics&expansions=affiliation.user_id",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to get user: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const user = data.data as UserData;
  const orgUserId = user.affiliation?.user_id?.[0] || null;

  return { user, orgUserId };
}

async function getAffiliatedUsers(
  token: string,
  orgUserId: string
): Promise<UserData[]> {
  const affiliates: UserData[] = [];
  let paginationToken: string | undefined;

  do {
    const url = new URL(
      `https://api.x.com/2/users/${orgUserId}/affiliates`
    );
    url.searchParams.set(
      "user.fields",
      "affiliation,profile_image_url,description,public_metrics"
    );
    url.searchParams.set("max_results", "1000");

    if (paginationToken) {
      url.searchParams.set("pagination_token", paginationToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to get affiliates: ${res.status} ${await res.text()}`
      );
    }

    const data = await res.json();
    if (data.data) {
      affiliates.push(...data.data);
    }

    paginationToken = data.meta?.next_token;
  } while (paginationToken);

  return affiliates;
}

function renderHomePage(token: string | null): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>X Company Affiliates Finder</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        h1 {
            color: #1DA1F2;
            font-size: 2.5em;
            margin-bottom: 20px;
        }
        p {
            color: #657786;
            font-size: 1.1em;
            margin-bottom: 40px;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background: #1DA1F2;
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-size: 1.1em;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.4);
        }
        .btn:hover {
            background: #1991DA;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(29, 161, 242, 0.6);
        }
        .feature-list {
            text-align: left;
            margin: 30px 0;
            padding: 0 20px;
        }
        .feature-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            color: #14171A;
        }
        .feature-icon {
            background: #E8F5FE;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 1.2em;
        }
        .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #AAB8C2;
        }
        .footer a {
            color: #1DA1F2;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏢 X Affiliates Finder</h1>
        <p>Discover colleagues and team members from your organization on X (Twitter)</p>
        
        <div class="feature-list">
            <div class="feature-item">
                <div class="feature-icon">🔐</div>
                <span>Secure OAuth 2.0 authentication</span>
            </div>
            <div class="feature-item">
                <div class="feature-icon">🔍</div>
                <span>Find your company affiliation</span>
            </div>
            <div class="feature-item">
                <div class="feature-icon">👥</div>
                <span>View all affiliated members</span>
            </div>
        </div>
        
        <a href="${token ? "/dashboard" : "/login"}" class="btn">
            ${token ? "View Dashboard" : "Login with X"}
        </a>
        
        <div class="footer">
            Built with <a href="https://github.com/janwilmake/simplerauth">simplerauth</a>
        </div>
    </div>
</body>
</html>`,
    {
      headers: { "content-type": "text/html" },
    }
  );
}

function renderDashboard(
  user: UserData,
  affiliates: UserData[],
  orgUserId: string | null
): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - X Affiliates</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #F7F9FA;
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 20px;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid #1DA1F2;
        }
        .user-details h1 {
            color: #14171A;
            font-size: 1.8em;
            margin-bottom: 5px;
        }
        .username {
            color: #657786;
            font-size: 1.1em;
        }
        .stats {
            display: flex;
            gap: 30px;
            margin-top: 10px;
        }
        .stat {
            font-size: 0.9em;
        }
        .stat-number {
            font-weight: bold;
            color: #14171A;
        }
        .stat-label {
            color: #657786;
        }
        .nav-buttons {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 12px 24px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #1DA1F2;
            color: white;
        }
        .btn-primary:hover {
            background: #1991DA;
        }
        .btn-secondary {
            background: #E8F5FE;
            color: #1DA1F2;
        }
        .btn-secondary:hover {
            background: #D6EAF8;
        }
        .affiliation-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .affiliation-badge h2 {
            font-size: 1.3em;
            margin-bottom: 10px;
        }
        .affiliation-badge p {
            opacity: 0.9;
            font-size: 1em;
        }
        .section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #14171A;
            font-size: 1.5em;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .count-badge {
            background: #1DA1F2;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .affiliate-card {
            border: 1px solid #E1E8ED;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        .affiliate-card:hover {
            border-color: #1DA1F2;
            box-shadow: 0 4px 15px rgba(29, 161, 242, 0.2);
            transform: translateY(-2px);
        }
        .affiliate-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 15px;
        }
        .affiliate-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 2px solid #E1E8ED;
        }
        .affiliate-info h3 {
            color: #14171A;
            font-size: 1.1em;
            margin-bottom: 3px;
        }
        .affiliate-info .username {
            color: #657786;
            font-size: 0.95em;
        }
        .affiliate-bio {
            color: #14171A;
            font-size: 0.9em;
            line-height: 1.5;
            margin-bottom: 15px;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .affiliate-stats {
            display: flex;
            justify-content: space-around;
            padding-top: 15px;
            border-top: 1px solid #E1E8ED;
        }
        .affiliate-stat {
            text-align: center;
        }
        .affiliate-stat-number {
            font-weight: bold;
            color: #14171A;
            font-size: 1.1em;
        }
        .affiliate-stat-label {
            color: #657786;
            font-size: 0.8em;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #657786;
        }
        .empty-state-icon {
            font-size: 4em;
            margin-bottom: 20px;
        }
        .empty-state h3 {
            color: #14171A;
            margin-bottom: 10px;
        }
        a.profile-link {
            color: inherit;
            text-decoration: none;
        }
        .x-link {
            display: inline-block;
            color: #1DA1F2;
            text-decoration: none;
            font-size: 0.9em;
            margin-top: 10px;
        }
        .x-link:hover {
            text-decoration: underline;
        }
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                align-items: flex-start;
            }
            .stats {
                flex-wrap: wrap;
            }
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="user-info">
            <img src="${user.profile_image_url?.replace("_normal", "_400x400")}" alt="${user.name}" class="avatar">
            <div class="user-details">
                <h1>${user.name}</h1>
                <div class="username">@${user.username}</div>
                ${
                  user.public_metrics
                    ? `
                <div class="stats">
                    <div class="stat">
                        <span class="stat-number">${user.public_metrics.followers_count.toLocaleString()}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${user.public_metrics.following_count.toLocaleString()}</span>
                        <span class="stat-label">Following</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${user.public_metrics.tweet_count.toLocaleString()}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                </div>
                `
                    : ""
                }
            </div>
        </div>
        <div class="nav-buttons">
            <a href="/" class="btn btn-secondary">Home</a>
            <a href="/logout" class="btn btn-primary">Logout</a>
        </div>
    </div>

    ${
      user.affiliation
        ? `
    <div class="affiliation-badge">
        <h2>🏢 Your Company Affiliation</h2>
        <p>${user.affiliation.description || "Affiliated organization member"}</p>
        ${user.affiliation.url ? `<a href="${user.affiliation.url}" class="x-link" target="_blank">Learn more →</a>` : ""}
    </div>
    `
        : orgUserId
          ? `
    <div class="affiliation-badge">
        <h2>🏢 Company Affiliation Detected</h2>
        <p>Organization ID: ${orgUserId}</p>
    </div>
    `
          : `
    <div class="section">
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>No Company Affiliation Found</h3>
            <p>Your X profile doesn't have a company affiliation set up yet.</p>
            <p>Contact your organization administrator to get added.</p>
        </div>
    </div>
    `
    }

    ${
      affiliates.length > 0
        ? `
    <div class="section">
        <h2>
            👥 Team Members
            <span class="count-badge">${affiliates.length}</span>
        </h2>
        <div class="grid">
            ${affiliates
              .map(
                (affiliate) => `
                <div class="affiliate-card">
                    <a href="https://x.com/${affiliate.username}" target="_blank" class="profile-link">
                        <div class="affiliate-header">
                            <img src="${affiliate.profile_image_url?.replace("_normal", "_bigger") || ""}" 
                                 alt="${affiliate.name}" 
                                 class="affiliate-avatar">
                            <div class="affiliate-info">
                                <h3>${affiliate.name}</h3>
                                <div class="username">@${affiliate.username}</div>
                            </div>
                        </div>
                    </a>
                    ${
                      affiliate.description
                        ? `<div class="affiliate-bio">${affiliate.description}</div>`
                        : ""
                    }
                    ${
                      affiliate.public_metrics
                        ? `
                    <div class="affiliate-stats">
                        <div class="affiliate-stat">
                            <div class="affiliate-stat-number">${affiliate.public_metrics.followers_count.toLocaleString()}</div>
                            <div class="affiliate-stat-label">Followers</div>
                        </div>
                        <div class="affiliate-stat">
                            <div class="affiliate-stat-number">${affiliate.public_metrics.following_count.toLocaleString()}</div>
                            <div class="affiliate-stat-label">Following</div>
                        </div>
                        <div class="affiliate-stat">
                            <div class="affiliate-stat-number">${affiliate.public_metrics.tweet_count.toLocaleString()}</div>
                            <div class="affiliate-stat-label">Posts</div>
                        </div>
                    </div>
                    `
                        : ""
                    }
                    <a href="https://x.com/${affiliate.username}" target="_blank" class="x-link">View on X →</a>
                </div>
            `
              )
              .join("")}
        </div>
    </div>
    `
        : orgUserId
          ? `
    <div class="section">
        <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h3>No Team Members Found</h3>
            <p>No other users are currently affiliated with your organization.</p>
        </div>
    </div>
    `
          : ""
    }
</body>
</html>`,
    {
      headers: { "content-type": "text/html" },
    }
  );
}

function renderErrorPage(message: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - X Affiliates</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }
        .error-icon {
            font-size: 4em;
            margin-bottom: 20px;
        }
        h1 {
            color: #E0245E;
            font-size: 2em;
            margin-bottom: 20px;
        }
        p {
            color: #657786;
            font-size: 1.1em;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background: #1DA1F2;
            color: white;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 50px;
            font-size: 1.1em;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        .btn:hover {
            background: #1991DA;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">⚠️</div>
        <h1>Oops! Something went wrong</h1>
        <p>${message}</p>
        <a href="/" class="btn">Go Home</a>
    </div>
</body>
</html>`,
    {
      status: 500,
      headers: { "content-type": "text/html" },
    }
  );
}

export default {
  fetch: async (request: Request, env: Env) => {
    // First, let the OAuth middleware handle authentication routes
    const middlewareResponse = await middleware(request, env);
    if (middlewareResponse) return middlewareResponse;

    const url = new URL(request.url);
    const token =
      request.headers
        .get("Cookie")
        ?.split(";")
        .find((r) => r.includes("x_access_token"))
        ?.split("=")[1] || url.searchParams.get("apiKey");

    // Home page
    if (url.pathname === "/") {
      return renderHomePage(token || null);
    }

    // Dashboard page (requires authentication)
    if (url.pathname === "/dashboard") {
      if (!token) {
        return Response.redirect(url.origin + "/login", 302);
      }

      try {
        // Get user and their affiliation
        const { user, orgUserId } = await getUserAffiliation(token);

        // Get affiliated users if orgUserId exists
        let affiliates: UserData[] = [];
        if (orgUserId) {
          try {
            affiliates = await getAffiliatedUsers(token, orgUserId);
          } catch (error) {
            console.error("Error getting affiliates:", error);
            // Continue anyway to show the user info
          }
        }

        return renderDashboard(user, affiliates, orgUserId);
      } catch (error) {
        console.error("Dashboard error:", error);
        return renderErrorPage(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard. Please try again."
        );
      }
    }

    // 404 for any other route
    return new Response("Not Found", { status: 404 });
  },
};