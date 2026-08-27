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
  tile.innerHTML = `${diyaIcon}<span class="placeholder-tag">image not found</span>`;
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

  // ---------- gang grid ----------
  const gangGrid = document.getElementById('gang-grid');
  if(gangGrid && DATA.gang){
    DATA.gang.forEach(label=>{
      gangGrid.innerHTML += `
        <div class="year-card">
          <div class="year-tile">
            ${diyaIcon}
            <span class="placeholder-tag">add photo</span>
          </div>
          <div class="year-body"><div class="meta">${label}</div></div>
        </div>`;
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