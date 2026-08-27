// ---------- icons ----------
const diyaIcon = `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 40 C8 30 18 26 32 26 C46 26 56 30 56 40 C56 48 46 52 32 52 C18 52 8 48 8 40Z" stroke="#FFD23F" stroke-width="2"/>
  <path d="M32 26 C29 18 33 12 32 6 C31 12 35 16 34 22" stroke="#FF9E1B" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="32" cy="40" rx="10" ry="4" fill="#FF9E1B" opacity="0.4"/>
</svg>`;

const playIcon = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="11" stroke="#FFD23F" stroke-width="1.4"/>
  <path d="M10 8.5 L16 12 L10 15.5 Z" fill="#FFD23F"/>
</svg>`;

// ---------- helpers ----------
function placeholderMedia(count, startVideoAt){
  const items = [];
  for(let i=1;i<=count;i++){
    const isVideo = startVideoAt && (i % startVideoAt === 0);
    items.push({ type:isVideo ? 'video' : 'image', label:(isVideo?'Video ':'Photo ')+i });
  }
  return items;
}

function initials(name){
  return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
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

  // ---------- gallery: carousel cards + lightbox ----------
  const yg = document.getElementById('year-grid');
  const overlay = document.getElementById('lightbox-overlay');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxGrid = document.getElementById('lightbox-grid');

  function openLightbox(y){
    lightboxTitle.textContent = `${y.yr} — ${DATA.name}`;
    lightboxGrid.innerHTML = y.media.map(m => `
      <div class="tile">
        ${m.type==='video' ? playIcon : diyaIcon}
        <div class="tile-label">${m.label}</div>
      </div>`).join('');
    overlay.classList.add('open');
  }
  function closeLightbox(){ overlay.classList.remove('open'); }
  overlay.addEventListener('click', e=>{ if(e.target === overlay) closeLightbox(); });
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeLightbox(); });

  if(yg && DATA.years){
    DATA.years.forEach(y=>{
      const card = document.createElement('div');
      card.className = 'year-card';
      const slides = y.media.map(m => `
        <div class="slide">
          ${m.type==='video' ? `<div class="video-badge">${playIcon}</div>` : ''}
          ${diyaIcon}
          <div class="slide-label">${m.label}</div>
        </div>`).join('');
      card.innerHTML = `
        <div class="carousel">
          <div class="carousel-track">${slides}</div>
          <span class="placeholder-tag">placeholder</span>
          <div class="carousel-dots">${y.media.map((_,i)=>`<span class="${i===0?'active':''}"></span>`).join('')}</div>
        </div>
        <div class="year-body">
          <div class="yr">${y.yr}</div>
          <div class="meta">${y.date}</div>
          <div class="sponsor">${y.sponsor}</div>
          <button class="link see-more">See all ${y.media.length} →</button>
        </div>`;
      card.querySelector('.see-more').addEventListener('click', ()=> openLightbox(y));
      yg.appendChild(card);

      // auto-slide
      const track = card.querySelector('.carousel-track');
      const dots = card.querySelectorAll('.carousel-dots span');
      let idx = 0;
      setInterval(()=>{
        idx = (idx+1) % y.media.length;
        track.style.transform = `translateX(-${idx*100}%)`;
        dots.forEach((d,i)=> d.classList.toggle('active', i===idx));
      }, 3000 + Math.random()*700);
    });
  }

  // ---------- gang grid ----------
  const gangGrid = document.getElementById('gang-grid');
  if(gangGrid && DATA.gang){
    DATA.gang.forEach(label=>{
      gangGrid.innerHTML += `
        <div class="year-card">
          <div class="carousel" style="height:170px;">
            <div class="carousel-track"><div class="slide">${diyaIcon}<div class="slide-label">${label}</div></div></div>
            <span class="placeholder-tag">add photo</span>
          </div>
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
  const cdDays = document.getElementById('cd-days');
  if(cdDays){
    const target = DATA.countdownTarget instanceof Date ? DATA.countdownTarget.getTime()
      : new Date(new Date().getFullYear() + (new Date().getMonth() > 8 ? 1 : 0), 8, 15).getTime();
    function tick(){
      const diff = Math.max(0, target - Date.now());
      document.getElementById('cd-days').textContent = String(Math.floor(diff/86400000)).padStart(2,'0');
      document.getElementById('cd-hours').textContent = String(Math.floor((diff%86400000)/3600000)).padStart(2,'0');
      document.getElementById('cd-mins').textContent = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
      document.getElementById('cd-secs').textContent = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    }
    tick(); setInterval(tick, 1000);
  }

  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
}
