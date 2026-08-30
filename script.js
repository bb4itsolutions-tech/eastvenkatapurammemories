// ---------- icons ----------
const diyaIcon = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 40 C8 30 18 26 32 26 C46 26 56 30 56 40 C56 48 46 52 32 52 C18 52 8 48 8 40Z" stroke="#FFD23F" stroke-width="2"/>
  <path d="M32 26 C29 18 33 12 32 6 C31 12 35 16 34 22" stroke="#FF9E1B" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="32" cy="40" rx="10" ry="4" fill="#FF9E1B" opacity="0.4"/>
</svg>`;

// ---------- helpers ----------
function initials(name){
  return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
function handleImgError(img){
  const tile = img.parentElement;
  tile.classList.remove('has-photo');
  tile.style.removeProperty('--cover');
  const label = tile.querySelector('.gang-label');
  const labelHTML = label ? label.outerHTML : '';
  tile.innerHTML = `${diyaIcon}<span class="placeholder-tag">image not found</span>${labelHTML}`;
}
function isRealMediaUrl(src){
  return typeof src === 'string'
    && src.trim() !== ''
    && !src.includes('ADD_')
    && !/^coming soon$/i.test(src.trim())
    && !/^paste\b/i.test(src.trim())
    && !/^add\b/i.test(src.trim());
}
function firstUrl(value){
  if(typeof value !== 'string') return '';
  const match = value.match(/https?:\/\/[^\s\]\)'"]+/i);
  return match ? match[0] : '';
}
function googleDriveFileId(src){
  const text = String(src || '');
  const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if(fileMatch) return fileMatch[1];
  const idMatch = text.match(/[?&]id=([^&#]+)/i);
  return idMatch ? idMatch[1] : '';
}
function displayImageUrl(src){
  if(typeof src !== 'string') return '';
  const raw = src.trim();
  const url = firstUrl(raw) || raw;
  const driveId = googleDriveFileId(url);
  return driveId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600` : url;
}
function cssImageUrl(src){
  return `url("${src.replace(/"/g, '\\"')}")`;
}
function photoImageUrl(photo){
  return displayImageUrl(photo.src) || displayImageUrl(firstUrl(photo.caption));
}
function placeholderSlideMarkup(year, title){
  return `
    <div class="memory-placeholder" aria-label="${year} group photo placeholder">
      ${diyaIcon}
    </div>`;
}
function loadingSlideMarkup(label){
  return `
    <div class="memory-placeholder" aria-label="${label}">
      ${diyaIcon}
      <p>${label}</p>
    </div>`;
}

// ---------- Gang photo discovery (works locally AND on GitHub Pages) ----------
// No API calls, no server, no manifest file. The browser simply checks
// whether numbered image files exist inside each "<year>_group_photos"
// folder. Because this only uses plain <img> loads (not fetch), it works
// the same way whether the page is opened by double-clicking index.html,
// served from a local dev server, or hosted on GitHub Pages.
//
// EXACT naming convention required (no variations checked — keeping this to
// one exact pattern is what keeps the number of requests low):
//   Folder:  <year>_group_photos     — all lowercase, e.g. 2025_group_photos
//   Files:   1.jpg, 2.jpg, 3.jpg ...  — plain numbers, no leading zeros,
//            lowercase ".jpg" extension only (convert PNG/HEIC photos to
//            JPG before uploading)
// Numbers should start at 1 and stay mostly contiguous. Deleting one photo
// from the middle is fine (a small gap is tolerated); heavily renumber if
// you delete several in a row so scanning doesn't stop early.
const GANG_FOLDER_SUFFIX = 'group_photos';
const GANG_EXTENSION = 'jpg';
const GANG_MAX_PHOTOS_PER_YEAR = 60;
const GANG_MAX_CONSECUTIVE_GAPS = 3;
const GANG_YEAR_CONCURRENCY = 3; // how many years get checked at once — keeps request bursts gentle
const GANG_CACHE_TTL_MS = 5 * 60 * 1000; // speeds up repeat page loads in the same browser tab

function gangCacheGet(key){
  try{
    const raw = sessionStorage.getItem(key);
    if(!raw) return undefined;
    const parsed = JSON.parse(raw);
    if(!parsed || (Date.now() - parsed.ts) > GANG_CACHE_TTL_MS) return undefined;
    return parsed.value;
  } catch(e){
    return undefined;
  }
}
function gangCacheSet(key, value){
  try{ sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), value })); }
  catch(e){ /* storage unavailable (private mode, some file:// setups) — safe to ignore */ }
}

// Runs an async function over a list with only `limit` running at once,
// instead of firing everything simultaneously — spreads requests out so we
// don't trip a host's burst-rate protection.
async function mapWithConcurrency(items, limit, fn){
  const results = new Array(items.length);
  let next = 0;
  async function worker(){
    while(next < items.length){
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function probeImageExists(url){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function gangPhotoUrl(yr, index){
  return `${yr}_${GANG_FOLDER_SUFFIX}/${index}.${GANG_EXTENSION}`;
}

// Scans one year's folder, numbered file by numbered file, stopping once
// several numbers in a row come up empty. One request per number checked —
// no folder-casing or extension guessing.
async function scanGangFolder(yr){
  const photos = [];
  let consecutiveMisses = 0;
  for(let i = 1; i <= GANG_MAX_PHOTOS_PER_YEAR; i++){
    const url = gangPhotoUrl(yr, i);
    const exists = await probeImageExists(url);
    if(exists){
      photos.push({ src: url, title:`Photo ${i}` });
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      if(consecutiveMisses >= GANG_MAX_CONSECUTIVE_GAPS) break;
    }
  }
  return photos;
}

// Discovers every "<year>_group_photos" folder that actually has numbered
// photos in it. The candidate range comes from gangFallbackYears (plus one
// year ahead) rather than an arbitrary wide range, and years are checked a
// few at a time (not all at once) to keep the request burst gentle.
async function discoverGangYears(fallbackYears){
  const cacheKey = 'gang-years-v4';
  const cached = gangCacheGet(cacheKey);
  if(cached) return cached;

  const knownYears = (fallbackYears && fallbackYears.length) ? fallbackYears : [new Date().getFullYear()];
  const floor = Math.min(...knownYears);
  const ceiling = Math.max(new Date().getFullYear() + 1, ...knownYears);
  const candidateYears = [];
  for(let yr = ceiling; yr >= floor; yr--) candidateYears.push(yr);

  const scans = await mapWithConcurrency(candidateYears, GANG_YEAR_CONCURRENCY, async yr => {
    const photos = await scanGangFolder(yr);
    return { yr, photos };
  });

  let years = scans.filter(y => y.photos.length > 0).sort((a,b) => b.yr - a.yr);
  if(!years.length && fallbackYears && fallbackYears.length){
    years = fallbackYears.slice().sort((a,b) => b - a).map(yr => ({ yr, photos: [] }));
  }

  gangCacheSet(cacheKey, years);
  return years;
}

function initGangMemoryViewer(DATA){
  const viewer = document.getElementById('memory-viewer');
  if(!viewer) return;

  const tabsEl = document.getElementById('memory-year-tabs');
  const shell = document.getElementById('memory-photo-shell');
  const frame = document.getElementById('memory-frame');
  const dotsEl = document.getElementById('memory-dots');
  const prevBtn = viewer.querySelector('[data-memory-prev]');
  const nextBtn = viewer.querySelector('[data-memory-next]');

  const SCROLL_SPEED = 58; // px/sec — constant drift speed of the photo reel, no pauses between photos

  // Track whether the section is actually on screen. Photos load right
  // away regardless (see below) so they're ready by the time someone
  // scrolls down — but the reel only drifts while this is true, and pauses
  // again if they scroll away and come back.
  let sectionVisible = false;
  const gangSection = document.getElementById('gang') || viewer;
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { sectionVisible = entry.isIntersecting; });
    }, { threshold: 0.15 });
    io.observe(gangSection);
  } else {
    sectionVisible = true; // very old browsers without IntersectionObserver — just always animate
  }

  tabsEl.innerHTML = '';
  shell.className = 'memory-photo-shell';
  shell.innerHTML = loadingSlideMarkup('Loading photos…');
  if(dotsEl) dotsEl.innerHTML = '';

  (async function run(){
    const discovered = await discoverGangYears(DATA.gangFallbackYears);
    if(!discovered.length) return;

    const years = discovered.map(y => ({
      yr: y.yr,
      photos: y.photos.length ? y.photos : [{ title:`${y.yr} Group Photo`, caption:'Photos coming soon.' }]
    }));

    let activeYearIndex = 0;
    let track = null;
    let setWidth = 0;      // px width of one full (non-duplicated) set of cards, for seamless looping
    let scrollOffset = 0;  // current px scroll position
    let yearDwell = 0;     // seconds spent on the current year (used when there's nothing to scroll)
    let dragging = false;
    let hovered = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let lastTs = null;
    let recalcScheduled = false;

    tabsEl.innerHTML = years.map((year, index) => `
      <button class="memory-tab" type="button" role="tab" aria-selected="false" data-year-index="${index}">
        <span>${year.yr}</span>
      </button>
    `).join('');
    const tabs = Array.from(tabsEl.querySelectorAll('.memory-tab'));
    if(dotsEl) dotsEl.innerHTML = '';

    // Coalesces recalculation when several photos in a row finish loading
    // around the same time, instead of recalculating (and risking a visible
    // shift) after every single one.
    function scheduleRecalc(){
      if(recalcScheduled) return;
      recalcScheduled = true;
      requestAnimationFrame(() => {
        recalcScheduled = false;
        recalcSetWidth();
        updateActiveHighlight();
      });
    }

    function makeCard(year, photo, index, hidden){
      const title = photo.title || `${year.yr} Group Photo ${index + 1}`;
      const photoSrc = photoImageUrl(photo);
      const hasPhoto = isRealMediaUrl(photoSrc);
      const card = document.createElement('div');
      card.className = `memory-roll-card ${hasPhoto ? 'has-photo' : 'is-placeholder'}`;
      if(hidden) card.setAttribute('aria-hidden', 'true');

      if(hasPhoto){
        card.style.setProperty('--card-cover', cssImageUrl(photoSrc));
        const img = document.createElement('img');
        img.src = photoSrc;
        img.alt = hidden ? '' : title;
        img.draggable = false;
        img.loading = 'eager'; // preload right away rather than waiting for scroll proximity
        img.onload = () => {
          const ratio = img.naturalWidth / img.naturalHeight;
          card.classList.toggle('is-wide', ratio > 1.15);
          card.classList.toggle('is-tall', ratio < 0.78);
          scheduleRecalc();
        };
        img.onerror = () => {
          card.className = 'memory-roll-card is-placeholder';
          card.style.removeProperty('--card-cover');
          card.innerHTML = placeholderSlideMarkup(year.yr, 'Image not found');
          scheduleRecalc();
        };
        card.appendChild(img);
      } else {
        card.innerHTML = placeholderSlideMarkup(year.yr, title);
      }
      return card;
    }

    function buildYearCards(){
      const year = years[activeYearIndex];
      shell.innerHTML = '';
      shell.className = 'memory-photo-shell roll-mode';
      shell.style.removeProperty('--memory-cover');

      track = document.createElement('div');
      track.className = 'memory-roll-track';
      track.style.transition = 'none'; // continuous JS-driven scroll, not a CSS-eased jump

      year.photos.forEach((photo, index) => track.appendChild(makeCard(year, photo, index, false)));
      // Duplicate the set once so the loop point is invisible (only makes sense with 2+ photos)
      if(year.photos.length > 1){
        year.photos.forEach((photo, index) => track.appendChild(makeCard(year, photo, index, true)));
      }

      shell.appendChild(track);
      scrollOffset = 0;
      yearDwell = 0;
      track.style.transform = 'translateX(0px)';
      requestAnimationFrame(() => { recalcSetWidth(); updateActiveHighlight(); });
    }

    function recalcSetWidth(){
      if(!track) return;
      const originalCount = years[activeYearIndex].photos.length;
      const cards = track.children;
      if(originalCount === 0 || cards.length <= originalCount){
        setWidth = 0;
        centerStaticCard();
        return;
      }
      setWidth = cards[originalCount].offsetLeft;
    }

    // Used when a year has nothing to scroll through (a single photo, or the
    // "coming soon" placeholder) — centers that one card in the frame
    // instead of leaving it sitting flush against the left edge.
    function centerStaticCard(){
      if(!track || !track.firstElementChild) return;
      const card = track.firstElementChild;
      const center = shell.clientWidth / 2;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      scrollOffset = cardCenter - center;
      applyOffset();
    }

    function updateActiveHighlight(){
      if(!track) return;
      const center = shell.clientWidth / 2;
      let closest = null, closestDist = Infinity;
      Array.from(track.children).forEach(card => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2 - scrollOffset;
        const dist = Math.abs(cardCenter - center);
        if(dist < closestDist){ closestDist = dist; closest = card; }
      });
      Array.from(track.children).forEach(card => card.classList.toggle('active', card === closest));
    }

    function applyOffset(){
      if(track) track.style.transform = `translateX(${-scrollOffset}px)`;
    }

    function jumpBy(deltaPx){
      if(!track) return;
      scrollOffset += deltaPx;
      scrollOffset = setWidth > 0 ? ((scrollOffset % setWidth) + setWidth) % setWidth : Math.max(0, scrollOffset);
      applyOffset();
      updateActiveHighlight();
    }

    function cardStep(){
      if(!track || !track.firstElementChild) return 260;
      const rect = track.firstElementChild.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 18;
      return rect.width + gap;
    }

    function selectYear(index){
      activeYearIndex = index;
      tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        tab.setAttribute('aria-selected', String(i === index));
      });
      buildYearCards();
    }

    // Once the current year's photos finish one full pass (or, for a year
    // with nothing to scroll, after a short dwell), move to the next year
    // and highlight its tab — cycling back to the first year after the last.
    function advanceYear(){
      selectYear((activeYearIndex + 1) % years.length);
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => selectYear(Number(tab.dataset.yearIndex)));
    });

    prevBtn.addEventListener('click', () => jumpBy(-cardStep()));
    nextBtn.addEventListener('click', () => jumpBy(cardStep()));

    // Drag/swipe to browse manually — continuous drift resumes on release.
    frame.addEventListener('pointerdown', event => {
      dragging = true;
      dragStartX = event.clientX;
      dragStartOffset = scrollOffset;
      if(frame.setPointerCapture){
        try{ frame.setPointerCapture(event.pointerId); } catch(e){ /* ignore */ }
      }
    });
    frame.addEventListener('pointermove', event => {
      if(!dragging) return;
      const dx = event.clientX - dragStartX;
      let next = dragStartOffset - dx;
      next = setWidth > 0 ? ((next % setWidth) + setWidth) % setWidth : Math.max(0, next);
      scrollOffset = next;
      applyOffset();
    });
    function endDrag(){
      if(!dragging) return;
      dragging = false;
      updateActiveHighlight();
    }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);
    frame.addEventListener('pointerleave', () => { if(dragging) endDrag(); });

    // Only a real mouse hovering should pause the drift — on touch devices,
    // tapping fires a "pointerenter" with no matching "leave" event later,
    // which would otherwise leave the reel stuck paused after the first tap.
    viewer.addEventListener('pointerenter', event => { if(event.pointerType === 'mouse') hovered = true; });
    viewer.addEventListener('pointerleave', event => { if(event.pointerType === 'mouse') hovered = false; });
    document.addEventListener('visibilitychange', () => {
      if(!document.hidden) lastTs = null; // avoid a big jump after the tab was hidden a while
    });
    window.addEventListener('resize', () => recalcSetWidth());

    const STATIC_YEAR_DWELL = 3.5; // seconds to show a year that has nothing to scroll (single photo / placeholder) before moving on

    function tick(ts){
      requestAnimationFrame(tick);
      if(lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.25); // clamp so a slow frame can't cause a visible skip
      lastTs = ts;
      if(!sectionVisible || hovered || dragging || document.hidden) return;

      try{
        if(setWidth > 0){
          scrollOffset += SCROLL_SPEED * dt;
          if(scrollOffset >= setWidth){
            scrollOffset -= setWidth;
            advanceYear(); // completed one full pass through this year's photos — move on
            return;
          }
          applyOffset();
          updateActiveHighlight();
        } else {
          // Nothing to scroll (a single photo or a "coming soon" placeholder)
          // — just wait a moment on it, then move to the next year anyway.
          yearDwell += dt;
          if(yearDwell >= STATIC_YEAR_DWELL) advanceYear();
        }
      } catch(e){
        console.error('Gang viewer tick error:', e); // fail loud in the console, never freeze silently
      }
    }

    selectYear(0);
    requestAnimationFrame(tick);
  })();
}

// ---------- init ----------
function initSite(DATA){

  // starfield
  const starsEl = document.getElementById('stars');
  for(let i=0;i<60;i++){
    const s = document.createElement('span');
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*100+'%';
    s.style.animationDelay = (Math.random()*3)+'s';
    starsEl.appendChild(s);
  }

  // garland svg generator
  function drawGarland(id, colorA, colorB){
    const el = document.getElementById(id);
    if(!el) return;
    const w = 1200, bulbs = 22;
    let path = `M0 10 `;
    let bulbSVG = '';
    for(let i=0;i<=bulbs;i++){
      const x = (w/bulbs)*i;
      const sway = Math.sin(i*0.9) * 14 + 22;
      path += `Q ${x - (w/bulbs)/2} ${sway+18}, ${x} ${sway} `;
      const color = i % 2 === 0 ? colorA : colorB;
      bulbSVG += `<circle cx="${x}" cy="${sway}" r="4.2" fill="${color}" opacity="0.95"><animate attributeName="opacity" values="0.5;1;0.5" dur="${2+ (i%4)*0.4}s" repeatCount="indefinite" begin="${i*0.15}s"/></circle>`;
    }
    el.innerHTML = `<path d="${path}" stroke="rgba(255,251,243,0.18)" fill="none" stroke-width="1.5"/>${bulbSVG}`;
  }
  const garlandColors = [
    ['#FF9E1B','#FFD23F'], ['#FFD23F','#E3B23C'], ['#FF9E1B','#FF4B3E'], ['#FFD23F','#FF9E1B'], ['#E3B23C','#FFD23F']
  ];
  document.querySelectorAll('.garland svg').forEach((el, i)=>{
    const [a,b] = garlandColors[i % garlandColors.length];
    drawGarland(el.id, a, b);
  });

  // ---------- Gang: year-by-year memory viewer (auto-discovers photos from GitHub folders) ----------
  initGangMemoryViewer(DATA);

  // ---------- gallery: one photo (or video) per year + link to Google Drive album ----------
  const yg = document.getElementById('year-grid');
  if(yg && DATA.years){
    DATA.years.forEach(y=>{
      const card = document.createElement('div');
      card.className = 'year-card';
      const hasVideo = !!y.videoUrl;
      const hasPhoto = !!y.photoUrl && !hasVideo; // video takes priority over a static cover photo
      const hasAlbum = !!y.driveUrl;
      card.innerHTML = `
        <div class="year-tile${hasPhoto ? ' has-photo' : ''}${hasVideo ? ' has-video' : ''}"${hasPhoto ? ` style="--cover:url('${y.photoUrl}')"` : ''}>
          ${hasVideo
            ? `<video src="${y.videoUrl}" autoplay muted loop playsinline preload="metadata" aria-label="${y.yr} Vinayaka Panduga video"></video>`
            : hasPhoto
              ? `<img src="${y.photoUrl}" alt="${y.yr} Vinayaka Panduga cover photo" loading="lazy" onerror="handleImgError(this)">`
              : `${diyaIcon}<span class="placeholder-tag">placeholder photo</span>`}
        </div>
        <div class="year-body">
          <div class="yr">${y.yr}</div>
          <div class="meta">${y.date}</div>
          <div class="sponsor">${y.sponsor}</div>
          ${hasAlbum
            ? `<a class="gallery-btn" href="${y.driveUrl}" target="_blank" rel="noopener">View Full Gallery →</a>`
            : `<span class="gallery-btn is-disabled">Gallery Coming Soon</span>`}
        </div>`;
      yg.appendChild(card);
    });
  }

  // ---------- members ----------
  const mg = document.getElementById('member-grid');
  if(mg && DATA.members){
    DATA.members.forEach(([role,name])=>{
      mg.innerHTML += `
        <div class="member">
          <div class="avatar">${initials(name)}</div>
          <div class="name">${name}</div>
          <div class="role">${role}</div>
        </div>`;
    });
  }

  // ---------- countdown ----------
  const cdDays = document.getElementById('cd-days');

  if (cdDays) {

    // Festival starts on September 14, 2026
    // Month is zero-based, so 8 = September
    const target = new Date(2026, 8, 14, 0, 0, 0).getTime();

    function tick() {

      const diff = Math.max(0, target - Date.now());

      document.getElementById('cd-days').textContent =
        String(Math.floor(diff / 86400000)).padStart(2, '0');

      document.getElementById('cd-hours').textContent =
        String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');

      document.getElementById('cd-mins').textContent =
        String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');

      document.getElementById('cd-secs').textContent =
        String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    }

    tick();
    setInterval(tick, 1000);
  }

  const yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

}
