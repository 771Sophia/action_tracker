# Action Tracker Dashboard

Local-first daily action tracker with:
- Exclusive timers
- Counter items (`+ / -`)
- Daily trading journal
- Weekly dashboard
- Pomodoro + auto to-do checks
- Optional GitHub JSON sync

## Deploy To GitHub Pages (Recommended)

Use this when you do not want to keep a local Python server running.

### 1) Push project to GitHub repo

Local git is already initialized in this folder (`main` branch, first commit done).

In CMD (replace with your repo URL):

```cmd
cd /d C:\Users\MY-PC\.gemini\antigravity\scratch\action_tracker
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

If GitHub asks for password, paste your **classic PAT** (not account password).

Later updates:

```cmd
git add .
git commit -m "Update tracker"
git push
```

**Pages + private repo note:** personal private repos may need GitHub Pro for Pages.  
If Pages is greyed out, make this frontend repo Public (data stays in your separate private sync repo / localStorage).

### 2) Enable Pages

In GitHub:
1. Open repository
2. `Settings` -> `Pages`
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
4. Click **Save**

After ~1-3 minutes, GitHub shows your Pages URL:

`https://<your-user>.github.io/<repo>/`

## Daily Update Flow

When you change code locally:
1. Save files
2. `git add .`
3. `git commit -m "your message"`
4. `git push`

Pages auto-redeploys on each push to `main`.

## Data & Sync Notes

- App data is stored in browser `localStorage` by default (per device/browser).
- If you want cross-device merge, configure GitHub sync in app Settings.
- `Save and Push` pushes current data JSON manually.
- Journal save can also auto-push if sync credentials are configured.

## Troubleshooting

### Pages URL shows old UI
- Hard refresh: `Ctrl + F5`
- Wait 1-2 minutes for GitHub redeploy
- Check `Actions` tab for failed deploy

### Site opens but data seems missing
- Different browser/profile = different localStorage
- Use in-app Import JSON or GitHub sync Pull

