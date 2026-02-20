# Reddit Discussion Monitor

A personal monitoring tool that tracks Reddit discussions about video downloading tools and browser extensions.

## What It Does

This script monitors specific subreddits for posts where users discuss video downloading, stream recording, or related browser extensions. When relevant discussions are found, it sends digest notifications so I can manually participate and help users.

## How It Works

1. **Search** — Periodically queries Reddit's search API for new posts matching configured keywords in target subreddits
2. **Filter** — Scores each post for relevance (0-10) to filter out noise
3. **Notify** — Sends a daily digest of high-relevance posts via Telegram
4. **Respond** — I manually read each post and write a personal reply if I can help

## Scope

- **Read-only monitoring**: The app only reads public posts and comments
- **No automation of replies**: All responses are written and posted by me personally
- **No vote manipulation**: The app never upvotes, downvotes, or interacts with posts
- **No DMs**: The app does not access or send private messages
- **No user data collection**: Only post URLs and text content are stored temporarily

## Target Subreddits

- r/software
- r/chrome_extensions
- r/browsers
- r/VideoEditing
- r/datacurator
- r/AskTechnology
- r/techsupport

## Keywords

- "video downloader"
- "download videos"
- "stream recorder"
- "video downloadhelper alternative"
- "chrome extension download"
- "browser extension video"

## Technical Details

- **Language**: JavaScript (Node.js)
- **Reddit API**: Script-type OAuth app (read, identity scopes)
- **Rate limiting**: ~100-200 API calls/day, well within Reddit's 100 QPM limit
- **Data retention**: Posts older than 48 hours are automatically purged per Reddit's data policy
- **Storage**: Local database only, no cloud storage of Reddit data

## Privacy

- No Reddit user data is stored beyond post content and URLs
- No data is shared with third parties
- No data is used for training AI/ML models
- Compliant with Reddit's [Data API Terms](https://www.redditinc.com/policies/data-api-terms) and 48-hour data deletion requirement

## Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Reddit API credentials

# Run the monitor
node index.js
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REDDIT_CLIENT_ID` | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Reddit app client secret |
| `REDDIT_USERNAME` | Reddit account username |
| `REDDIT_PASSWORD` | Reddit account password |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications |
| `TELEGRAM_CHAT_ID` | Telegram chat ID for notifications |

## License

MIT
