// script.js - unified for login + register pages
document.addEventListener('DOMContentLoaded', () => {
    // year & dark mode
    const yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();
  
    const darkToggle = document.getElementById('darkToggle');
    const DARK_KEY = 'spotlight_dark';
    function applyDarkMode(enabled){
      if(enabled) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem(DARK_KEY, enabled ? '1' : '0');
    }
    if(localStorage.getItem(DARK_KEY) === '1') applyDarkMode(true);
    if(darkToggle){
      darkToggle.addEventListener('click', ()=> {
        const current = document.documentElement.classList.contains('dark');
        applyDarkMode(!current);
        darkToggle.textContent = !current ? '☀️' : '🌙';
      });
    }
  
    // toast helper
    const toastEl = document.getElementById('toast');
    function showToast(msg, timeout=2500){
      if(!toastEl) return;
      toastEl.textContent = msg;
      toastEl.style.display = 'block';
      setTimeout(()=> toastEl.style.display = 'none', timeout);
    }
  
    // pw toggles (both pages)
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if(!input) return;
        const newType = input.type === 'password' ? 'text' : 'password';
        input.type = newType;
        btn.textContent = newType === 'text' ? '🙈' : '👁️';
        input.focus();
      });
    });
  
    // utility: load users
    function loadUsers(){
      try{
        return JSON.parse(localStorage.getItem('spotlight_users') || '[]');
      }catch(e){
        return [];
      }
    }
    function saveUsers(arr){ localStorage.setItem('spotlight_users', JSON.stringify(arr)); }
  
    // REGISTER PAGE
    const registerForm = document.getElementById('registerForm');
    if(registerForm){
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // reset errors
        ['nameErr','regEmailErr','mobileErr','roleErr','regPassErr','confirmPassErr'].forEach(id=>{
          const el = document.getElementById(id); if(el) el.textContent = '';
        });
  
        const name = (document.getElementById('fullName')||{}).value?.trim() || '';
        const email = (document.getElementById('regEmail')||{}).value?.trim().toLowerCase() || '';
        const mobile = (document.getElementById('mobile')||{}).value?.trim() || '';
        const role = (document.getElementById('regRole')||{}).value || '';
        const pass = (document.getElementById('regPass')||{}).value || '';
        const confirm = (document.getElementById('confirmPass')||{}).value || '';
  
        let valid = true;
        if(name.length < 3){ document.getElementById('nameErr').textContent = 'Enter full name'; valid=false; }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ document.getElementById('regEmailErr').textContent = 'Enter valid email'; valid=false; }
        if(mobile && !/^[0-9]{10}$/.test(mobile)){ document.getElementById('mobileErr').textContent = 'Enter 10-digit mobile'; valid=false; }
        if(!role){ document.getElementById('roleErr').textContent = 'Select role'; valid=false; }
        if(pass.length < 6){ document.getElementById('regPassErr').textContent = 'Password min 6 chars'; valid=false; }
        if(confirm !== pass){ document.getElementById('confirmPassErr').textContent = 'Passwords do not match'; valid=false; }
        if(!valid) return;
  
        // check duplicate
        const users = loadUsers();
        if(users.some(u => u.email === email)){
          document.getElementById('regEmailErr').textContent = 'Account with this email already exists';
          return;
        }
  
        // store user (demo)
        users.push({name, email, mobile, role, password: pass, createdAt: Date.now()});
        saveUsers(users);
  
        showToast('Registration successful — redirecting to login...');
        setTimeout(()=> window.location.href = 'index.html', 900);
      });
    }
  
    // LOGIN PAGE
    const loginForm = document.getElementById('loginForm');
    if(loginForm){
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // reset
        ['emailErr','passErr'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=''; });
  
        const email = (document.getElementById('email')||{}).value?.trim().toLowerCase() || '';
        const pass = (document.getElementById('password')||{}).value || '';
        const role = (document.getElementById('role')||{}).value || 'student';
        const remember = !!document.getElementById('remember')?.checked;
  
        let valid = true;
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ document.getElementById('emailErr').textContent='Enter valid email'; valid=false; }
        if(!pass || pass.length < 6){ document.getElementById('passErr').textContent='Enter password (min 6)'; valid=false; }
        if(!valid) return;
  
        const users = loadUsers();
        const found = users.find(u => u.email === email && u.password === pass && (u.role === role));
        if(!found){
          // try helpful message: if email exists but password wrong
          const userByEmail = users.find(u => u.email === email);
          if(userByEmail && userByEmail.role !== role){
            showToast('Role mismatch. Select correct role.', 3000);
            return;
          }
          if(userByEmail){
            document.getElementById('passErr').textContent = 'Incorrect password';
            return;
          }
          // no account
          showToast('No account found. Please register first.', 3000);
          return;
        }
  
        // save current user (remember -> localStorage else sessionStorage)
        const current = {name: found.name, email: found.email, role: found.role, loggedAt: Date.now()};
        if(remember) localStorage.setItem('spotlight_current', JSON.stringify(current));
        else sessionStorage.setItem('spotlight_current', JSON.stringify(current));
  
        showToast('Login successful — redirecting...');
        setTimeout(()=> {
          // demo redirect to dashboard (role param added)
          window.location.href = `dashboard.html?role=${encodeURIComponent(found.role)}`;
        }, 700);
      });
    }
  
    // auto-populate login email if last registered
    const lastUsers = loadUsers();
    if(lastUsers && lastUsers.length && document.getElementById('email')){
      const last = lastUsers[lastUsers.length-1];
      document.getElementById('email').value = last.email || '';
    }
  });

// dasboard 
// Navbar avatar logic


/* ---------- Dashboard: robust page detection + image fallbacks ---------- */
(function(){
  // Run only if dashboard DOM exists (more reliable than URL check)
  const dashboardRoot = document.getElementById('upcomingCarousel') || document.getElementById('pastCarousel') || document.querySelector('.dashboard-main');
  if(!dashboardRoot) return;

  // Try these base folders and extensions for images
  const IMG_BASES = ['', 'assets/', './', './assets/'];
  const EXT_TRIES = ['.jpg', '.jpeg', '.png', '.webp'];

  function setSrcWithFallback(imgEl, basenameOrPath){
    if(!imgEl || !basenameOrPath) return;
    const name = String(basenameOrPath).replace(/^\.?\//,'');
    const hasSlash = name.includes('/');
    const hasExt = /\.[a-zA-Z0-9]+$/.test(name);

    const nameNoExt = hasExt ? name.replace(/\.[^.]+$/, '') : name;

    // If dev specified an extension, we still try alternates to survive typos (.jpg vs .jpeg)
    let candidates = [];
    if(hasSlash){
      // Path already contains folder(s)
      if(hasExt){
        candidates.push(name);
        EXT_TRIES.forEach(ext => { if(!name.endsWith(ext)) candidates.push(nameNoExt + ext); });
      } else {
        EXT_TRIES.forEach(ext => candidates.push(name + ext));
      }
    } else {
      // Just a filename
      if(hasExt){
        IMG_BASES.forEach(b => candidates.push(b + name));
        EXT_TRIES.forEach(ext => { if(!name.endsWith(ext)) IMG_BASES.forEach(b => candidates.push(b + nameNoExt + ext)); });
      } else {
        IMG_BASES.forEach(b => EXT_TRIES.forEach(ext => candidates.push(b + name + ext)));
      }
    }

    let i = 0;
    function tryNext(){
      if(i >= candidates.length){
        imgEl.alt = (imgEl.alt || 'image') + ' (missing)';
        imgEl.style.opacity = 0.3; // subtle hint in UI
        return;
      }
      imgEl.src = candidates[i++];
      imgEl.onerror = tryNext;
    }
    tryNext();
  }

  // ---------------- Sample data ----------------
  const upcomingEvents = [
    {id:'up1', title:'Diwali Dhamaka', date:'Nov 2, 2025 • 6:00 PM', img:'diwali'},
    {id:'up2', title:'Navratri Night', date:'Oct 12, 2025 • 7:00 PM', img:'navratri'},
    {id:'up3', title:'Orientation Day', date:'Aug 18, 2025 • 10:00 AM', img:'orientation'},
    {id:'up4', title:'Hackathon 24H', date:'Aug 18, 2025 • 9:00 AM', img:'hackathon'}
  ];
  const pastEvents = [
    {id:'p1', title:'BGMI Tournament', date:'Jun 20, 2025', img:'bgmi'},
    {id:'p2', title:'PieceCode Finals', date:'May 30, 2025', img:'piececode'},
    {id:'p3', title:'Navratri 2024', date:'Oct 10, 2024', img:'navratri'},
    {id:'p4', title:'Volleyball Finals', date:'Mar 14, 2025', img:'volleyball'} // fixed likely typo
  ];

  // ---------------- Stats & role ----------------
  const totalEl = document.getElementById('totalEvents');
  const upEl = document.getElementById('upcomingCount');
  const pastEl = document.getElementById('pastCount');
  if(totalEl && upEl && pastEl){
    totalEl.textContent = upcomingEvents.length + pastEvents.length;
    upEl.textContent = upcomingEvents.length;
    pastEl.textContent = pastEvents.length;
  }

  const current = JSON.parse(localStorage.getItem('spotlight_current') || sessionStorage.getItem('spotlight_current') || 'null');
  if(!current){ window.location.href = 'index.html'; return; }
  const welcomeText = document.getElementById('welcomeText');
  const userRole = document.getElementById('userRole');
  if(welcomeText) welcomeText.textContent = `Welcome, ${current.name}`;
  if(userRole) userRole.textContent = current.role.charAt(0).toUpperCase()+current.role.slice(1);

  const avatar = document.getElementById('userAvatar');
  if(avatar) setSrcWithFallback(avatar, 'logo'); // tries logo.(jpg|jpeg|png|webp) in ./ and ./assets/

  if(current.role === 'student'){
    const s = document.getElementById('studentSection'); if(s) s.style.display = 'block';
  } else if(current.role === 'faculty'){
    const f = document.getElementById('facultySection'); if(f) f.style.display = 'block';
  }

  // ---------------- Build carousels ----------------
  const uTrack = document.querySelector('#upcomingCarousel .carousel-track');
  const pTrack = document.querySelector('#pastCarousel .poster-track');

  if(uTrack){
    upcomingEvents.forEach(ev => {
      const slide = document.createElement('div'); slide.className = 'slide';
      slide.innerHTML = `
        <div style="position:relative">
          <span class="date-badge">${ev.date.split('•')[0].trim()}</span>
          <img class="slide-img" alt="${ev.title}">
        </div>
        <div class="slide-body">
          <h3 class="slide-title">${ev.title}</h3>
          <div class="slide-meta">${ev.date} • ${ev.desc || ''}</div>
          <div style="margin-top:8px;">
            <button class="btn btn-primary registerBtn" data-id="${ev.id}">Register</button>
            <a href="event-detail.html?ev=${ev.id}" class="btn btn-outline" style="margin-left:8px">Details</a>
          </div>
        </div>`;
      const img = slide.querySelector('img');
      setSrcWithFallback(img, ev.img);
      slide.addEventListener('click', (e)=>{
        if(e.target.closest('.registerBtn') || e.target.closest('a')) return;
        window.location.href = `event-detail.html?ev=${ev.id}`;
      });
      uTrack.appendChild(slide);
    });
  }

  if(pTrack){
    pastEvents.forEach(ev => {
      const poster = document.createElement('div'); poster.className = 'poster';
      poster.innerHTML = `
        <img alt="${ev.title}" />
        <div class="poster-overlay">${ev.title} • ${ev.date}</div>`;
      const img = poster.querySelector('img');
      setSrcWithFallback(img, ev.img);
      poster.addEventListener('click', ()=> window.location.href = `event-detail.html?ev=${ev.id}`);
      pTrack.appendChild(poster);
    });
  }

  // ---------------- Controls, swipe, a11y ----------------
  function makeCarouselControls(rootId){
    const root = document.getElementById(rootId);
    if(!root) return;
    const track = root.querySelector(rootId === 'upcomingCarousel' ? '.carousel-track' : '.poster-track');
    const left = root.querySelector('.carousel-arrow.left');
    const right = root.querySelector('.carousel-arrow.right');

    left && left.addEventListener('click', ()=> track.scrollBy({ left: -(track.clientWidth * 0.7), behavior: 'smooth' }));
    right && right.addEventListener('click', ()=> track.scrollBy({ left: (track.clientWidth * 0.7), behavior: 'smooth' }));

    root.addEventListener('keydown', (e)=> {
      if(e.key === 'ArrowLeft') left && left.click();
      if(e.key === 'ArrowRight') right && right.click();
    });

    let startX = 0, isDown = false;
    track.addEventListener('pointerdown', (e)=> { isDown = true; startX = e.clientX; track.style.scrollBehavior = 'auto'; });
    window.addEventListener('pointerup', (e)=> {
      if(!isDown) return; isDown = false; track.style.scrollBehavior = 'smooth';
      const diff = startX - e.clientX;
      if(Math.abs(diff) > 40) track.scrollBy({ left: diff > 0 ? (track.clientWidth * 0.7) : -(track.clientWidth * 0.7) });
    });
  }

  makeCarouselControls('upcomingCarousel');
  makeCarouselControls('pastCarousel');

  document.querySelectorAll('.carousel, .poster-carousel').forEach(c => {
    c.addEventListener('focus', ()=> c.classList.add('focused'));
    c.addEventListener('blur', ()=> c.classList.remove('focused'));
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', ()=> {
    localStorage.removeItem('spotlight_current'); sessionStorage.removeItem('spotlight_current');
    window.location.href = 'index.html';
  });
})();
/* ---------- Event Detail Page Logic ---------- */
(function(){
  // check agar detail page hai
  const detailRoot = document.getElementById("eventDetailPage");
  if(!detailRoot) return;

  // same event data reuse karo (ya apna array/object idhar copy kar lo)
  const allEvents = {
    up1: {
      title: "Diwali Dhamaka",
      date: "Nov 2, 2025 • 6:00 PM",
      venue: "Main Auditorium",
      img: "diwali",
      desc: "Celebrate the festival of lights with music, dance, and cultural performances.",
      speakers: ["Cultural Secretary", "Music Club"]
    },
    up2: {
      title: "Navratri Night",
      date: "Oct 12, 2025 • 7:00 PM",
      venue: "College Ground",
      img: "navratri",
      desc: "An evening of Garba, Dandiya, and fun-filled traditions.",
      speakers: ["Dance Club", "Student Union"]
    },
    up3: {
      title: "Orientation Day",
      date: "Aug 18, 2025 • 10:00 AM",
      venue: "Seminar Hall",
      img: "orientation",
      desc: "Welcome ceremony for new students with introduction to clubs and activities.",
      speakers: ["Principal", "HODs", "Student Council"]
    }
    // add baaki bhi events
  };

  // query param se event id uthao
  const params = new URLSearchParams(window.location.search);
  const evId = params.get("ev");

  // DOM elements
  const nameEl = document.getElementById("eventName");
  const dateEl = document.getElementById("eventDate");
  const venueEl = document.getElementById("eventVenue");
  const descEl = document.getElementById("eventDescription");
  const speakersEl = document.getElementById("eventSpeakers");
  const imgEl = document.getElementById("eventImage");

  if(evId && allEvents[evId]){
    const ev = allEvents[evId];
    nameEl.textContent = ev.title;
    dateEl.textContent = ev.date;
    venueEl.textContent = ev.venue;
    descEl.textContent = ev.desc;
    imgEl.src = ev.img + ".jpg"; // ya fallback logic reuse karo
    speakersEl.innerHTML = ev.speakers.map(s => `<li>${s}</li>`).join("");
  } else {
    nameEl.textContent = "Event not found!";
  }
})();
