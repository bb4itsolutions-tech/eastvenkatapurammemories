# East Venkatapuram Memories — Website

A small static website with placeholder content for a village festival memories archive, now split across **two festival pages** that share one look and feel.

## Files — upload ALL of these together

- `index.html` — Vinayaka Panduga (home page)
- `poleramma-jatara.html` — Poleramma Jatara
- `styles.css` — shared design (colors, fonts, layout) used by both pages
- `script.js` — shared logic (gallery cards, members, countdown) used by both pages

If you only upload `index.html` without `styles.css` and `script.js`, the page will load with no styling and an empty gallery — all four files must sit in the same folder.

## What's inside (placeholders to replace later)

- **Festival tabs** in the header — switch between Vinayaka Panduga and Poleramma Jatara, each its own page
- Hero + countdown to next festival — set the real date via `countdownTarget` in the `<script>` block at the bottom of each page (e.g. `new Date(2027, 8, 15)`)
- **Year-by-year gallery** — one placeholder cover photo per year, with a "View Full Gallery" button linking out to a Google Drive (or Google Photos) shared folder — see "About storage" below for why
- Group photo grid ("The Gang")
- Members grid with names and roles
- Find Us / contact section — add real address, phone, email, and a Google Maps embed link
- Feedback form — currently just shows an alert; connect it to Google Forms or a service like Formspree to actually receive messages for free

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

Each year in `SITE_DATA.years` now has two separate links:

- `photoUrl` — a **direct image link** shown as the cover photo on that year's card
- `driveUrl` — the **full album link** shown as a "View Full Gallery →" button

A normal Google Drive "share" link (`.../file/d/FILE_ID/view`) will **not** display as an image — you need a direct-image URL instead:

1. Open the photo in Google Drive, click **Share → Anyone with the link**, and copy the link — it looks like `https://drive.google.com/file/d/FILE_ID/view`
2. Grab just the `FILE_ID` part out of that link
3. Build the direct-image link: `https://lh3.googleusercontent.com/d/FILE_ID`
4. Paste that into `photoUrl` for the matching year

Leave `photoUrl:''` empty for a year without a cover photo yet — it'll fall back to the placeholder diya icon automatically. The "View Full Gallery" button only appears once `driveUrl` is filled in; otherwise it shows a disabled "Gallery Coming Soon" button.

## Editing content

Open `index.html` or `poleramma-jatara.html` in any text editor and edit the `SITE_DATA` object near the bottom of the file — that's where all the year/member/gang content lives for that page. Search for these placeholder markers:
- `Add name` — member names
- `Set date` — event dates
- `Add sponsor name` / `Idol sponsor: add name` — sponsor credits
- `driveUrl:''` or `ADD_YOUR_FOLDER_ID` — paste your real Google Drive share link here for that year (leave `driveUrl:''` empty for a year that isn't ready — it shows "Gallery Coming Soon" automatically)
