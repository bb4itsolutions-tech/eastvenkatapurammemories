# East Venkatapuram Memories — Website

A small static website with placeholder content for a village festival memories archive, now split across **two festival pages** that share one look and feel.

## Files — upload ALL of these together

- `index.html` — Vinayaka Panduga (home page)
- `poleramma-jatara.html` — Poleramma Jatara
- `styles.css` — shared design (colors, fonts, layout) used by both pages
- `script.js` — shared logic (gallery carousels, lightbox, members, countdown) used by both pages

If you only upload `index.html` without `styles.css` and `script.js`, the page will load with no styling and an empty gallery — all four files must sit in the same folder.

## What's inside (placeholders to replace later)

- **Festival tabs** in the header — switch between Vinayaka Panduga and Poleramma Jatara, each its own page
- Hero + countdown to next festival — set the real date via `countdownTarget` in the `<script>` block at the bottom of each page (e.g. `new Date(2027, 8, 15)`)
- **Year-by-year gallery** — each year card auto-slides through its photos/videos; click "See all" to open a full-album lightbox with every item for that year. Swap placeholder tiles for real `<img>`/`<video>` elements in `script.js` once you have real media
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

## Adding your own custom domain later

Once you buy `eastvenkatapurammemories.in` (or `.com`):
1. In repo Settings → Pages, enter the custom domain and save (this creates a `CNAME` file).
2. At your domain registrar, add a CNAME record pointing to `<your-username>.github.io`.
3. GitHub will auto-issue a free HTTPS certificate within a few minutes to an hour.

## Editing content

Open `index.html` or `poleramma-jatara.html` in any text editor and edit the `SITE_DATA` object near the bottom of the file — that's where all the year/member/gang content lives for that page. Search for these placeholder markers:
- `Add name` — member names
- `Set date` — event dates
- `Add sponsor name` / `Idol sponsor: add name` — sponsor credits
- `placeholderMedia(6, 4)` — change the first number to how many photos/videos that year has

Real photos: in `script.js`, the gallery slide markup currently renders an icon (`diyaIcon`). Replace that with an `<img>` tag pointing to your photo once you have real images uploaded to the repo or linked from Google Photos.
