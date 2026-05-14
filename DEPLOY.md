# Council — Deploy Guide
## From zero to app on your phone in ~10 minutes

---

## STEP 1 — Get your API keys (do this first)

You need at least the Anthropic key. Others are optional but unlock more models.

| Provider | Where to get it | Cost |
|----------|----------------|------|
| **Anthropic (Claude)** — REQUIRED | console.anthropic.com → API Keys | Pay as you go ~$0.003/query |
| OpenAI (ChatGPT) | platform.openai.com → API Keys | Pay as you go ~$0.005/query |
| Google (Gemini) | aistudio.google.com → Get API Key | Free tier available |
| xAI (Grok) | console.x.ai → API Keys | Pay as you go ~$0.005/query |

---

## STEP 2 — Create a GitHub account (if you don't have one)

1. Go to **github.com** and sign up (free)
2. Click **"New repository"**
3. Name it `council-ai`
4. Set to **Public**, click **Create repository**

---

## STEP 3 — Upload the project files to GitHub

1. On your new repo page, click **"uploading an existing file"**
2. Upload ALL the files from the `council-ai` folder you received:
   ```
   council-ai/
   ├── package.json
   ├── server/
   │   └── index.js
   └── public/
       ├── index.html
       ├── app.js
       ├── manifest.json
       ├── sw.js
       ├── icon-192.png
       └── icon-512.png
   ```
3. Click **"Commit changes"**

---

## STEP 4 — Deploy to Railway

1. Go to **railway.app** and sign up with your GitHub account (free)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `council-ai` repository
5. Railway will detect it's a Node.js app automatically
6. Click **Deploy** — wait about 60 seconds

---

## STEP 5 — Add your API keys to Railway

This is important — your keys are SECRET and never go in the code files.

1. In Railway, click your project → **"Variables"** tab
2. Add each key you have:

   | Variable Name | Your Value |
   |--------------|------------|
   | `ANTHROPIC_API_KEY` | your-claude-key-here |
   | `OPENAI_API_KEY` | your-openai-key-here |
   | `GEMINI_API_KEY` | your-gemini-key-here |
   | `GROK_API_KEY` | your-grok-key-here |

3. Railway will automatically redeploy after you save

---

## STEP 6 — Get your app URL

1. In Railway, click **"Settings"** → **"Domains"**
2. Click **"Generate Domain"**
3. You'll get a URL like: `council-ai-production.up.railway.app`

Open that URL in your browser — your Council app is live! 🎉

---

## STEP 7 — Add to your iPhone home screen

1. Open your Council URL in **Safari** on your iPhone
   *(must be Safari — Chrome won't allow home screen install)*
2. Tap the **Share button** (box with arrow at bottom of screen)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it **Council** and tap **Add**

It will appear on your home screen with the gold icon and open full-screen like a native app.

**Android:** Open in Chrome → tap the three-dot menu → "Add to Home screen"

---

## COSTS

Running on Railway free tier:
- **Hosting**: Free (Railway gives $5/month free credit — more than enough for personal use)
- **API calls**: ~$0.02 per full 4-model question (2 cents)
- $5 in API credits ≈ 250 questions across all 4 models

---

## TROUBLESHOOTING

**"Cannot connect to server"** → Check Railway deployment logs, make sure it shows "Running"

**"API error — check key"** on a model** → Double-check that variable name matches exactly in Railway

**App doesn't install to home screen** → Must use Safari on iPhone, not Chrome

**Models responding slowly** → Normal — parallel calls to 4 different servers. Usually 5–10 seconds.

---

## UPDATING THE APP

If you want to make changes later:
1. Edit files on GitHub directly (click the file → pencil icon)
2. Railway auto-redeploys within 60 seconds

---

*Built with Claude · council-ai · your own private AI consensus engine*
