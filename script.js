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
  const slideMs = 2200;

  // Don't check any folders or start auto-advancing yet — wait until the
  // person actually scrolls near this section. Show a quiet idle state
  // until then so nothing loads (and nothing scrolls) on page load.
  tabsEl.innerHTML = '';
  shell.className = 'memory-photo-shell';
  shell.innerHTML = loadingSlideMarkup('Scroll here to load photos…');

  function boot(){
    shell.innerHTML = loadingSlideMarkup('Loading photos…');
    (async function run(){
    const discovered = await discoverGangYears(DATA.gangFallbackYears);
    if(!discovered.length) return;

    const years = discovered.map(y => ({
      yr: y.yr,
      photos: y.photos.length ? y.photos : [{ title:`${y.yr} Group Photo`, caption:'Photos coming soon.' }]
    }));

    let activeYearIndex = 0;
    let activePhotoIndex = 0;
    let renderedYearIndex = -1;
    let timer = null;
    let touchStartX = 0;
    let touchStartY = 0;

    tabsEl.innerHTML = years.map((year, index) => `
      <button class="memory-tab" type="button" role="tab" aria-selected="false" data-year-index="${index}">
        <span>${year.yr}</span>
      </button>
    `).join('');

    const tabs = Array.from(tabsEl.querySelectorAll('.memory-tab'));

    function startActiveTabProgress(){
      tabs.forEach(tab => {
        tab.classList.remove('is-progressing');
        tab.style.removeProperty('--slide-duration');
      });

      const tab = tabs[activeYearIndex];
      if(!tab) return;
      tab.style.setProperty('--slide-duration', (slideMs * years[activeYearIndex].photos.length) + 'ms');
      void tab.offsetWidth;
      tab.classList.add('is-progressing');
    }

    function restartTimer(){
      clearTimeout(timer);
      timer = setTimeout(showNextPhoto, slideMs);
    }

    function buildYearCards(){
      const year = years[activeYearIndex];
      const track = document.createElement('div');
      track.className = 'memory-roll-track';

      shell.innerHTML = '';
      shell.className = 'memory-photo-shell roll-mode';
      shell.style.removeProperty('--memory-cover');

      year.photos.forEach((photo, index) => {
        const title = photo.title || `${year.yr} Group Photo ${index + 1}`;
        const photoSrc = photoImageUrl(photo);
        const hasPhoto = isRealMediaUrl(photoSrc);
        const card = document.createElement('div');
        card.className = `memory-roll-card ${hasPhoto ? 'has-photo' : 'is-placeholder'}`;
        card.dataset.photoIndex = String(index);

        if(hasPhoto){
          card.style.setProperty('--card-cover', cssImageUrl(photoSrc));
          const img = document.createElement('img');
          img.src = photoSrc;
          img.alt = title;
          img.draggable = false;
          img.loading = index === 0 ? 'eager' : 'lazy';
          img.onload = () => {
            const ratio = img.naturalWidth / img.naturalHeight;
            card.classList.toggle('is-wide', ratio > 1.15);
            card.classList.toggle('is-tall', ratio < 0.78);
            centerActiveCard();
          };
          img.onerror = () => {
            card.className = 'memory-roll-card is-placeholder';
            card.style.removeProperty('--card-cover');
            card.innerHTML = placeholderSlideMarkup(year.yr, 'Image not found');
          };
          card.appendChild(img);
        } else {
          card.innerHTML = placeholderSlideMarkup(year.yr, title);
        }

        track.appendChild(card);
      });

      shell.appendChild(track);
      renderedYearIndex = activeYearIndex;
    }

    function centerActiveCard(){
      const track = shell.querySelector('.memory-roll-track');
      const activeCard = shell.querySelector(`.memory-roll-card[data-photo-index="${activePhotoIndex}"]`);
      if(!track || !activeCard) return;

      const offset = (shell.clientWidth / 2) - (activeCard.offsetLeft + activeCard.offsetWidth / 2);
      track.style.transform = `translateX(${offset}px)`;
    }

    function renderSlide(yearChanged = false){
      const year = years[activeYearIndex];
      const photos = year.photos;
      const photo = photos[activePhotoIndex] || photos[0];
      const photoSrc = photoImageUrl(photo);
      const hasPhoto = isRealMediaUrl(photoSrc);

      if(yearChanged || renderedYearIndex !== activeYearIndex){
        buildYearCards();
      }

      tabs.forEach((tab, index) => {
        const isActive = index === activeYearIndex;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      frame.classList.remove('is-changing');
      frame.setAttribute('aria-label', `${year.yr} group photo ${activePhotoIndex + 1} of ${photos.length}`);
      void frame.offsetWidth;
      frame.classList.add('is-changing');

      if(hasPhoto){
        shell.style.setProperty('--memory-cover', cssImageUrl(photoSrc));
        shell.classList.add('has-active-photo');
      } else {
        shell.style.removeProperty('--memory-cover');
        shell.classList.remove('has-active-photo');
      }

      shell.querySelectorAll('.memory-roll-card').forEach(card => {
        const index = Number(card.dataset.photoIndex);
        card.classList.toggle('active', index === activePhotoIndex);
        card.classList.toggle('is-near-active', Math.abs(index - activePhotoIndex) === 1);
      });

      dotsEl.innerHTML = photos.map((_, index) => `
        <button class="memory-dot${index === activePhotoIndex ? ' active' : ''}" type="button" aria-label="Show photo ${index + 1}" data-photo-index="${index}"></button>
      `).join('');

      dotsEl.querySelectorAll('.memory-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          activePhotoIndex = Number(dot.dataset.photoIndex);
          renderSlide(false);
          restartTimer();
        });
      });

      requestAnimationFrame(centerActiveCard);
      if(yearChanged || activePhotoIndex === 0){
        startActiveTabProgress();
      }
    }

    function showNextPhoto(){
      const photos = years[activeYearIndex].photos;
      if(activePhotoIndex < photos.length - 1){
        activePhotoIndex += 1;
        renderSlide(false);
      } else {
        activeYearIndex = (activeYearIndex + 1) % years.length;
        activePhotoIndex = 0;
        renderSlide(true);
      }
      restartTimer();
    }

    function showPreviousPhoto(){
      if(activePhotoIndex > 0){
        activePhotoIndex -= 1;
        renderSlide(false);
      } else {
        activeYearIndex = (activeYearIndex - 1 + years.length) % years.length;
        activePhotoIndex = years[activeYearIndex].photos.length - 1;
        renderSlide(true);
      }
      restartTimer();
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        activeYearIndex = Number(tab.dataset.yearIndex);
        activePhotoIndex = 0;
        renderSlide(true);
        restartTimer();
      });
    });

    prevBtn.addEventListener('click', showPreviousPhoto);
    nextBtn.addEventListener('click', showNextPhoto);

    frame.addEventListener('pointerdown', event => {
      touchStartX = event.clientX;
      touchStartY = event.clientY;
    });

    frame.addEventListener('pointerup', event => {
      const diffX = event.clientX - touchStartX;
      const diffY = event.clientY - touchStartY;
      if(Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)){
        diffX < 0 ? showNextPhoto() : showPreviousPhoto();
      }
    });

    viewer.addEventListener('mouseenter', () => clearTimeout(timer));
    viewer.addEventListener('mouseleave', restartTimer);
    document.addEventListener('visibilitychange', () => {
      document.hidden ? clearTimeout(timer) : restartTimer();
    });
    window.addEventListener('resize', centerActiveCard);

    renderSlide(true);
    restartTimer();
    })();
  }

  const gangSection = document.getElementById('gang') || viewer;
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          io.disconnect();
          boot();
        }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(gangSection);
  } else {
    boot(); // very old browsers without IntersectionObserver — just load right away
  }
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

  // ---------- gallery: one photo per year + link to Google Drive album ----------
  const yg = document.getElementById('year-grid');
  if(yg && DATA.years){
    DATA.years.forEach(y=>{
      const card = document.createElement('div');
      card.className = 'year-card';
      const hasPhoto = !!y.photoUrl;
      const hasAlbum = !!y.driveUrl;
      card.innerHTML = `
        <div class="year-tile${hasPhoto ? ' has-photo' : ''}"${hasPhoto ? ` style="--cover:url('${y.photoUrl}')"` : ''}>
          ${hasPhoto
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
