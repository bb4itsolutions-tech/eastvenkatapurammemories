# East Venkatapuram Memories — Website

A single-file static website (`index.html`) with placeholder content for a village festival memories archive. Everything needed to preview and edit is in one file — no build tools required.

## What's inside (placeholders to replace later)

- Hero + countdown to next festival — set the real date inside the `<script>` at the bottom (`const target = ...`)
- Year-by-year gallery — replace icon tiles with real `<img>` photos and links to Google Photos albums
- Lucky draw winners table
- Group photo grid ("The Gang")
- Members grid with names and roles
- UPI donation section — replace the QR placeholder with your real QR code image, and swap `yourid@upi`
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

Open `index.html` in any text editor (even Notepad) and search for these placeholder markers to replace:
- `Add name` — member names
- `Set date` — event dates
- `Add prize` — lucky draw prizes
- `yourid@upi` — your real UPI ID
- Photo tiles — swap the SVG icon divs for `<img src="your-photo.jpg">` tags
