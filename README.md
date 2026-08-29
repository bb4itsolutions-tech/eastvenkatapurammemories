# East Venkatapuram Memories — Website

A small static website with placeholder content for a village festival memories archive, now split across **two festival pages** that share one look and feel.

## Files — upload ALL of these together

- `index.html` — Vinayaka Panduga (home page)
- `poleramma-jatara.html` — Poleramma Jatara
- `styles.css` — shared design (colors, fonts, layout) used by both pages
- `script.js` — shared logic (gallery cards, members, countdown) used by both pages

If you only upload `index.html` without `styles.css` and `script.js`, the page will load with no styling and an empty gallery — all four files must sit in the same folder.

The `<year>_group_photos` folders (see "The Gang slideshow" below) are separate from these four core files — you can add/remove photos in those folders anytime without touching or re-uploading `index.html`, `styles.css`, `script.js`, or `poleramma-jatara.html`.

## What's inside (placeholders to replace later)

- **Festival tabs** in the header — switch between Vinayaka Panduga and Poleramma Jatara, each its own page
- Hero + countdown to next festival — set the real date via `countdownTarget` in the `<script>` block at the bottom of each page (e.g. `new Date(2027, 8, 15)`)
- **Year-by-year gallery** — idol cards with sponsor notes and full album links
- **The Gang slideshow** — one large group-photo viewer with year tabs from 2025 to 2017. Photos auto-slide within a year, then move to the next older year.
- Members grid with names and roles
- Find Us / contact section — add real address, phone, email, and a Google Maps embed link
- Feedback form — wired up to [Formspree](https://formspree.io) (free) so submissions actually get emailed to you; see "Making the feedback form save responses" below to finish setup

## Deploy for free — GitHub Pages (recommended)

1. Create a free GitHub account at github.com if you don't have one.
2. Create a new repository, e.g. named `eastvenkatapurammemories`.
3. Upload `index.html` (and any images you add) to that repository — you can drag and drop files directly on the GitHub website, no command line needed.
4. Go to the repo's **Settings → Pages**.
5. Under "Build and deployment", set Source to **Deploy from a branch**, pick branch `main` and folder `/ (root)`, then Save.
6. Wait 1-2 minutes — your site will be live at:
   `https://<your-github-username>.github.io/eastvenkatapurammemories/`

## About storage — why photos/videos go on Google Drive, not GitHub

GitHub free repos are best kept under ~1GB, individual files are blocked over 100MB, and browser uploads cap at 25MB per file — a single festival's photos and videos can easily blow past that. So this site never stores media in the repo. Instead, each year's "View Full Gallery" button links to a Google Drive (or Google Photos) folder you share separately:

1. Upload that year's photos/videos to a Google Drive folder
2. Right-click the folder → Share → "Anyone with the link" → Copy link
3. Paste that link into the `driveUrl` field for that year (see below)

This way you can add unlimited photos/videos per year without ever touching GitHub's size limits.

## Adding your own custom domain later

Once you buy `eastvenkatapurammemories.in` (or `.com`):
1. In repo Settings → Pages, enter the custom domain and save (this creates a `CNAME` file).
2. At your domain registrar, add a CNAME record pointing to `<your-username>.github.io`.
3. GitHub will auto-issue a free HTTPS certificate within a few minutes to an hour.

## Cover photo per year (`photoUrl`) + View Full Gallery button

The older small-card gallery used `SITE_DATA.years` with two separate links:

- `photoUrl` — a **direct image link** shown as the cover photo on that year's card
- `driveUrl` — the **full album link** shown as a "View Full Gallery →" button

A normal Google Drive "share" link (`.../file/d/FILE_ID/view`) will **not** display as an image — you need a direct-image URL instead:

1. Open the photo in Google Drive, click **Share → Anyone with the link**, and copy the link — it looks like `https://drive.google.com/file/d/FILE_ID/view`
2. Grab just the `FILE_ID` part out of that link
3. Build the direct-image link: `https://lh3.googleusercontent.com/d/FILE_ID`
4. Paste that into `photoUrl` for the matching year

Leave `photoUrl:''` empty for a year without a cover photo yet — it'll fall back to the placeholder diya icon automatically. The "View Full Gallery" button only appears once `driveUrl` is filled in; otherwise it shows a disabled "Gallery Coming Soon" button.

## The Gang slideshow — folder-based, no code edits needed

The Gang section no longer lists photos anywhere in the code. Instead, every time someone loads the page, the site asks GitHub what image files currently exist inside year-named folders at the root of the repo, and builds the slideshow from whatever it finds. To add or remove photos, just add or remove files in the matching folder on GitHub — nothing in `index.html` needs to change, ever.

**Folder naming (exact):**
```
2025_group_photos/
2024_group_photos/
2023_group_photos/
...
2017_group_photos/
```

Each folder can hold any number of `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif` files, named however you like (e.g. `IMG_001.jpg`, `group1.jpg`). Photos display in alphabetical/numeric order by filename, so name them `01.jpg`, `02.jpg`, etc. if a specific order matters.

**To add a new festival year:** create a new folder called `2026_group_photos` at the repo root and upload photos into it — the site will automatically pick it up and add a new year tab, no code changes required.

**To remove a photo:** delete the file from the folder on GitHub. It disappears from the site on the next page load.

**Technical note:** this works by calling GitHub's public API (`api.github.com`) directly from the visitor's browser, which is free and needs no setup, but is capped at 60 unauthenticated requests/hour per visitor IP. The site caches each folder's listing in the visitor's browser for 5 minutes to stay well under that limit for normal traffic. If GitHub can't be reached at all (rare — e.g. a visitor is offline or GitHub is down), the section falls back to the year list in `gangFallbackYears` inside `SITE_DATA` in `index.html`, so tabs still show up instead of the section disappearing.

If you ever rename the GitHub org, repo, or default branch, update these three lines near the top of `script.js`:
```js
const GH_OWNER = 'bb4itsolutions-tech';
const GH_REPO = 'eastvenkatapurammemories';
const GH_BRANCH = 'main';
```

## Making the feedback form save responses (Formspree — free)

Right now the "Share your thoughts" form on the Find Us section is wired to Formspree but points at a placeholder ID, so it won't deliver anywhere until you finish this 2-minute setup:

1. Go to [formspree.io](https://formspree.io) and sign up free with `bb4itsolutions@gmail.com` (or whichever inbox should get the messages).
2. Click **New Form**, give it a name like "East Venkatapuram Feedback", and create it.
3. Formspree will show you a form endpoint that looks like `https://formspree.io/f/abcd1234`.
4. Open `index.html`, find this line:
   ```html
   <form class="feedback" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
   and replace `YOUR_FORM_ID` with the ID from step 3.
5. Save, re-upload `index.html` to GitHub, and submit the form once yourself to confirm the test email arrives — Formspree asks you to confirm the first submission.

Free tier covers 50 submissions/month, which is plenty for a feedback form like this. Every submission after that just lands in your Formspree dashboard (viewable anytime) rather than your inbox, so nothing is ever lost.

If you'd rather responses land in a Google Sheet instead of email, Google Forms is the other free no-code option — but it means swapping this styled form for an embedded Google Form, which won't match the site's look. Let me know if you'd prefer that instead and I can set it up.

## Editing content

## The Gang slideshow now uses local files only

The Gang section pulls its photos straight from the `<year>_group_photos` folders in the repo (see above) — no Google Drive or Google Photos links involved for this section anymore, since GitHub can only auto-list files it hosts itself. Just upload compressed image files into the matching year folder in GitHub and they'll show up automatically.

(Google Drive links are still used for the separate year-by-year **Gallery** cards below — see `photoUrl` / `driveUrl` above, that part is unchanged.)

Open `index.html` or `poleramma-jatara.html` in any text editor and edit the `SITE_DATA` object near the bottom of the file — that's where the gallery/member content lives for that page. Search for these placeholder markers:
- `Add name` — member names
- `Set date` — event dates
- `Add sponsor name` / `Idol sponsor: add name` — sponsor credits
- `driveUrl:''` or `ADD_YOUR_FOLDER_ID` — paste your real Google Drive share link here for that year (leave `driveUrl:''` empty for a year that isn't ready — it shows "Gallery Coming Soon" automatically)
