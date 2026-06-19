const KEY='aaf6a69ac6e873f723913a154d4c475c';
let userRegion='US';
async function detectRegion(){
  try{
    const r=await fetch('https://ipapi.co/json/');
    const d=await r.json();
    if(d.country_code) userRegion=d.country_code;
  }catch(e){
    try{
      const loc=navigator.language||'en-US';
      const parts=loc.split('-');
      if(parts.length>1) userRegion=parts[1].toUpperCase();
    }catch(e2){}
  }
}
const IMG='https://image.tmdb.org/t/p/';
let currentShow=null,currentType='tv',allSeasons=[],blockedSeasons=new Set();
let selectedSeason=null,allEpisodes={},currentNav='shows';
let minRating=0,searchTimer=null,isLightMode=false;
let watchHistory=JSON.parse(localStorage.getItem('shufflr_history')||'[]');
let recentShows=JSON.parse(localStorage.getItem('shufflr_recent')||'[]');
const SHUFFLR_PLAYLISTS_KEY='shufflr_playlists';
const SHUFFLR_ACTIVE_PLAYLIST_KEY='shufflr_active_playlist';
let playlists=JSON.parse(localStorage.getItem(SHUFFLR_PLAYLISTS_KEY)||'[]');

function handleExtensionPlaylistSync(payload){
  playlists=Array.isArray(payload)?payload:[];
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY,JSON.stringify(playlists));
  window.postMessage({type:'SHUFFLR_SYNC_PLAYLISTS',source:'shufflr-web',playlists},'*');
  try{
    if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
      chrome.storage.local.set({[SHUFFLR_PLAYLISTS_KEY]:playlists});
    }
  }catch(e){}
  if(currentNav==='playlist')renderPlaylistPage();
  const modal=document.getElementById('playlist-modal');
  if(modal?.classList.contains('open'))renderPlaylistModal();
}

function installExtensionPlaylistSync(){
  if(typeof chrome!=='undefined'&&chrome.runtime&&chrome.runtime.onMessage){
    chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
      if(message?.type!=='SHUFFLR_SYNC_PLAYLISTS')return;
      handleExtensionPlaylistSync(message.payload);
      sendResponse({ok:true});
      return true;
    });
  }

  window.addEventListener('message',(event)=>{
    if(event.source!==window)return;
    if(event.data?.source!=='shufflr-extension')return;
    if(event.data?.type!=='SHUFFLR_SYNC_PLAYLISTS')return;
    handleExtensionPlaylistSync(event.data.payload);
  });
}

installExtensionPlaylistSync();

window.addEventListener('shufflr-playlists-merged',(event)=>{
  handleExtensionPlaylistSync(event.detail);
});

window.addEventListener('shufflr-auth-changed',()=>{
  if(currentNav==='shows'&&!currentShow){
    renderHomeScreen('shows');
  }else if(currentNav==='options'){
    renderOptionsPage();
  }
});

const SHUFFLR_SUPABASE_SESSION_KEY='shufflr_supabase_session';

function saveSupabaseSessionForExtension(sessionPayload){
  if(sessionPayload?.user?.id&&sessionPayload?.access_token){
    localStorage.setItem(SHUFFLR_SUPABASE_SESSION_KEY,JSON.stringify({
      userId:sessionPayload.user.id,
      accessToken:sessionPayload.access_token,
      refreshToken:sessionPayload.refresh_token||null,
      expiresAt:sessionPayload.expires_at||null,
    }));
  }else{
    localStorage.removeItem(SHUFFLR_SUPABASE_SESSION_KEY);
  }
  window.postMessage({type:'SHUFFLR_SUPABASE_SESSION_SYNC',source:'shufflr-web'},'*');
}

window.addEventListener('message',(event)=>{
  if(event.source!==window)return;
  if(event.data?.source!=='shufflr-web')return;
  if(event.data?.type!=='SHUFFLR_AUTH_SESSION')return;
  saveSupabaseSessionForExtension(event.data.session);
});

// Build a TMDB poster URL from a path, full URL, or bare filename.
function buildPosterUrl(posterPath,size='w185'){
  if(!posterPath)return'';
  const text=String(posterPath).trim();
  if(!text)return'';
  if(/^https?:\/\//i.test(text)){
    const tmdbMatch=text.match(/\/t\/p\/(?:original|w\d+)\/(.+)$/);
    if(tmdbMatch)return `${IMG}${size}/${tmdbMatch[1]}`;
    return text;
  }
  const path=text.startsWith('/')?text:`/${text}`;
  return IMG+size+path;
}

function getHomeShowDedupeKey(show){
  if(show?.id!=null&&show.id!=='')return`id:${show.id}`;
  const maxId=getShowMaxId(show);
  if(maxId)return`max:${maxId}`;
  const nameKey=normalizePlShowName(getShowLabel(show));
  if(nameKey)return`name:${nameKey}`;
  return'';
}

function getActivePlaylistShowsForHome(allPlaylists=playlists){
  const seen=new Set();
  const items=[];
  const source=Array.isArray(allPlaylists)?allPlaylists:playlists;
  for(let pi=0;pi<source.length;pi++){
    const plShows=source[pi]?.shows||[];
    for(let si=0;si<plShows.length;si++){
      const show=plShows[si];
      if(show?.release_date)continue;
      const key=getHomeShowDedupeKey(show);
      if(!key||seen.has(key))continue;
      seen.add(key);
      items.push({show,playlistIndex:pi,showIndex:si});
    }
  }
  return{items};
}

const YOUR_SHOWS_SMILEY_SVG=`<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="8" height="8" fill="#23A8E0"/>
  <rect x="32" y="8" width="8" height="8" fill="#23A8E0"/>
  <rect x="4" y="24" width="4" height="4" fill="#23A8E0"/>
  <rect x="40" y="24" width="4" height="4" fill="#23A8E0"/>
  <rect x="8" y="32" width="4" height="4" fill="#23A8E0"/>
  <rect x="12" y="36" width="4" height="4" fill="#23A8E0"/>
  <rect x="16" y="38" width="16" height="4" fill="#23A8E0"/>
  <rect x="32" y="36" width="4" height="4" fill="#23A8E0"/>
  <rect x="36" y="32" width="4" height="4" fill="#23A8E0"/>
</svg>`;

function yourShowNeedsPosterLookup(show){
  const hasTmdbId=show?.id!=null&&/^\d+$/.test(String(show.id));
  const hasPoster=!!(show?.poster_path&&buildPosterUrl(show.poster_path,'w185'));
  return!hasTmdbId||!hasPoster;
}

function getRecentlyWatchedPosterKey(showName){
  return stripServiceSuffixFromShowName(showName).toLowerCase();
}

function stripServiceSuffixFromShowName(showName){
  const text=String(showName||'').trim();
  const bulletIdx=text.indexOf(' • ');
  return bulletIdx>=0?text.slice(0,bulletIdx).trim():text;
}

function getRecentlyWatchedServiceLabel(){
  return 'HBO Max';
}

function formatRecentlyWatchedCardTitle(entry){
  const name=stripServiceSuffixFromShowName(entry?.show_name);
  const service=getRecentlyWatchedServiceLabel();
  return name?`${name} • ${service}`:service;
}

function buildDeferredPosterHtml(showKey,posterUrl,imgStyle){
  if(posterUrl){
    return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" onerror="this.style.background='#1a1a1a'" style="${imgStyle}" />`;
  }
  return `<div class="card-poster-wrap" style="position:relative;width:100%;height:100%;background:#1a1a1a;">
    <div class="card-poster-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">${YOUR_SHOWS_SMILEY_SVG}</div>
    <img data-show-key="${escapeHtml(showKey)}" src="" alt="" style="${imgStyle}opacity:0;" />
  </div>`;
}

function applyPosterToDomByShowKey(showKey,posterUrl){
  document.querySelectorAll('img[data-show-key]').forEach(img=>{
    if(img.dataset.showKey!==showKey)return;
    img.src=posterUrl;
    img.style.opacity='1';
    img.style.display='';
    img.closest('.card-poster-wrap')?.querySelector('.card-poster-placeholder')?.remove();
  });
}

async function resolveCardPostersFromTmdb(lookupMap,size='w185'){
  for(const [showKey,query] of lookupMap){
    const searchQuery=stripServiceSuffixFromShowName(query);
    if(!searchQuery)continue;
    try{
      const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(searchQuery)}`);
      const d=await r.json();
      const match=(d.results||[]).find(result=>result.poster_path)||(d.results||[])[0];
      if(!match?.poster_path)continue;
      applyPosterToDomByShowKey(showKey,buildPosterUrl(match.poster_path,size));
    }catch(e){
      console.error('[Shufflr] Poster lookup failed:',searchQuery,e);
    }
  }
}

function buildYourShowsPosterHtml(show,showKey){
  const posterUrl=buildPosterUrl(show.poster_path,'w185');
  const needsLookup=yourShowNeedsPosterLookup(show);
  const imgStyle='width:100%;height:220px;object-fit:cover;background:#1a1a1a;';
  if(needsLookup&&!posterUrl){
    return buildDeferredPosterHtml(showKey,'',imgStyle);
  }
  return buildDeferredPosterHtml(showKey,posterUrl,imgStyle);
}

async function resolveYourShowsPosters(items){
  const lookupMap=new Map();
  for(const {show} of (items||[])){
    if(!yourShowNeedsPosterLookup(show))continue;
    const showKey=getHomeShowDedupeKey(show);
    const query=getShowLabel(show);
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w185');
}

async function resolveRecentlyWatchedPosters(entries){
  const lookupMap=new Map();
  for(const entry of (entries||[])){
    if(buildPosterUrl(entry.poster_path,'w300'))continue;
    const query=stripServiceSuffixFromShowName(entry.show_name);
    const showKey=getRecentlyWatchedPosterKey(query);
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w300');
}

function getShowPosterPathFromShow(show){
  return show?.poster_path||show?.posterPath||show?.showPoster||show?.poster||show?.image||'';
}

function getPosterLookupKey(show){
  return getHomeShowDedupeKey(show)||getRecentlyWatchedPosterKey(stripServiceSuffixFromShowName(getShowLabel(show)));
}

function getPlaylistCoverShows(playlist){
  const shows=playlist?.shows||[];
  if(!shows.length)return[];
  if(shows.length===1)return[shows[0]];
  const slots=[...shows.slice(0,4)];
  while(slots.length<4)slots.push(shows[0]);
  return slots;
}

function buildPlaylistGridQuadrantHtml(show,playlistIndex,quadrantIndex){
  const showKey=`pl-cover:${playlistIndex}:${quadrantIndex}`;
  const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w185');
  if(posterUrl){
    return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" alt="" onerror="this.style.background='#1a1a1a'" />`;
  }
  return `<img data-show-key="${escapeHtml(showKey)}" src="" alt="" style="opacity:0;background:#1a1a1a;" />`;
}

function buildPlaylistCoverPosterHtml(playlist,playlistIndex){
  const customPoster=localStorage.getItem('shufflr_playlist_poster_'+(playlist.id||playlist.name));
  if(customPoster){
    return `<img src="${customPoster}" style="width:100%;height:100%;object-fit:cover;border-radius:8px 8px 0 0;">`;
  }
  const shows=playlist.shows||[];
  if(!shows.length){
    return `<div class="pl-poster-placeholder">
      ${YOUR_SHOWS_SMILEY_SVG}
    </div>`;
  }
  if(shows.length===1){
    const show=shows[0];
    const showKey=`pl-cover:${playlistIndex}:0`;
    const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w185');
    if(posterUrl){
      return `<img data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" onerror="this.style.background='#1a1a1a'" style="width:100%;height:100%;object-fit:cover;" />`;
    }
    return buildDeferredPosterHtml(showKey,'','width:100%;height:100%;object-fit:cover;');
  }
  const coverShows=getPlaylistCoverShows(playlist);
  return `<div class="pl-cover-grid">${coverShows.map((show,qi)=>(
    `<div class="pl-cover-grid-cell">${buildPlaylistGridQuadrantHtml(show,playlistIndex,qi)}</div>`
  )).join('')}</div>`;
}

async function resolvePlaylistCardPosters(allPlaylists,filtered){
  const lookupMap=new Map();
  for(const playlist of (filtered||[])){
    const index=allPlaylists.indexOf(playlist);
    if(index<0)continue;
    if(localStorage.getItem('shufflr_playlist_poster_'+(playlist.id||playlist.name)))continue;
    const coverShows=getPlaylistCoverShows(playlist);
    if(!coverShows.length)continue;
    coverShows.forEach((show,qi)=>{
      if(buildPosterUrl(getShowPosterPathFromShow(show),'w185'))return;
      const showKey=`pl-cover:${index}:${qi}`;
      const query=stripServiceSuffixFromShowName(getShowLabel(show));
      if(!query)return;
      lookupMap.set(showKey,query);
    });
  }
  await resolveCardPostersFromTmdb(lookupMap,'w185');
}

function buildDrawerShowThumbnailHtml(show){
  const showKey=getPosterLookupKey(show);
  const posterUrl=buildPosterUrl(getShowPosterPathFromShow(show),'w92');
  const imgStyle='width:28px;height:40px;object-fit:cover;border-radius:3px;margin-right:8px;flex-shrink:0;background:#222;';
  if(posterUrl){
    return `<img class="pl-drawer-add-poster" data-show-key="${escapeHtml(showKey)}" src="${posterUrl}" alt="" style="${imgStyle}" onerror="this.style.background='#222'" />`;
  }
  return `<img class="pl-drawer-add-poster" data-show-key="${escapeHtml(showKey)}" src="" alt="" style="${imgStyle}opacity:0;" />`;
}

async function resolveDrawerShowPosters(shows){
  const lookupMap=new Map();
  for(const show of (shows||[])){
    if(buildPosterUrl(getShowPosterPathFromShow(show),'w92'))continue;
    const showKey=getPosterLookupKey(show);
    const query=stripServiceSuffixFromShowName(getShowLabel(show));
    if(!showKey||!query)continue;
    lookupMap.set(showKey,query);
  }
  await resolveCardPostersFromTmdb(lookupMap,'w92');
}

function buildYourShowsSectionHtml(section){
  const items=section.items||[];
  if(!items.length)return'';

  let html=`<div class="genre-section" style="margin-top:16px;"><div class="genre-title">-- YOUR SHOWS --</div><div class="h-scroll-wrap">`;
  items.forEach(({show:s,playlistIndex:pi,showIndex:si})=>{
    const showKey=getHomeShowDedupeKey(s);
    html+=`<div class="ep-card-h your-show-card" data-show-playlist-index="${pi}" data-show-index="${si}">
      ${buildYourShowsPosterHtml(s,showKey)}
      <div class="ep-card-h-body">
        <div class="ep-card-h-name">${s.name||s.title||''}</div>
      </div>
    </div>`;
  });
  html+=`</div></div>`;
  return html;
}

function formatRelativeWatchTime(watchedAt) {
  if (!watchedAt) return '';
  const then = new Date(watchedAt).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? 's' : ''} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week !== 1 ? 's' : ''} ago`;
  return new Date(watchedAt).toLocaleDateString();
}

function dedupeWatchHistoryByShowId(entries) {
  const seen = new Set();
  return (entries || []).filter(entry => {
    const key = String(entry.show_id ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatRecentlyWatchedEpisodeLabel(entry) {
  const name = (entry.episode_name || '').trim();
  const epNum = entry.episode_number;
  if (epNum != null && name) return `E${epNum}: ${name}`;
  if (epNum != null) return `Episode ${epNum}`;
  if (name) return name;
  return '';
}

async function fetchTmdbEpisodeOverview(showId, seasonNum, episodeNumber) {
  if (!/^\d+$/.test(String(showId))) return null;
  const season = Number(seasonNum);
  const episode = Number(episodeNumber);
  if (!Number.isFinite(season) || !Number.isFinite(episode)) return null;
  try {
    const r = await fetch(
      `https://api.themoviedb.org/3/tv/${showId}/season/${season}/episode/${episode}?api_key=${KEY}&language=en-US`
    );
    if (!r.ok) return null;
    const data = await r.json();
    const overview = (data.overview || '').trim();
    return overview || null;
  } catch {
    return null;
  }
}

function getRecentlyWatchedMaxUrlFromEntry(entry){
  const stored=entry?.max_url||entry?.maxUrl||entry?.url||'';
  if(stored&&String(stored).includes('max.com'))return String(stored);
  const showId=entry?.show_id!=null?String(entry.show_id):'';
  if(showId&&!/^\d+$/.test(showId)){
    return `https://play.max.com/show/${showId}`;
  }
  return '';
}

function getRecentlyWatchedLaunchUrl(showId,showName,maxUrl){
  if(maxUrl&&String(maxUrl).includes('max.com'))return maxUrl;
  const normId=String(showId||'').trim();
  const name=stripServiceSuffixFromShowName(showName);
  if(normId&&!/^\d+$/.test(normId)){
    return `https://play.max.com/show/${normId}`;
  }
  if(name){
    return `https://play.max.com/search?q=${encodeURIComponent(name)}`;
  }
  return null;
}

async function resolveShowForRecentlyWatchedClick(showId, showName) {
  const storedPlaylists = await readPlaylistsFromChromeStorage();
  const allPlaylists = storedPlaylists || playlists || [];
  const normId = String(showId || '').trim();
  const normName = normalizePlShowName(showName);

  for (const playlist of allPlaylists) {
    for (const show of playlist?.shows || []) {
      const maxId = getShowMaxId(show);
      if (maxId && normId && String(maxId).toLowerCase() === normId.toLowerCase()) return show;
      if (show.id != null && normId && String(show.id) === normId) return show;
      const label = normalizePlShowName(getPlaylistShowLabel(show));
      if (normName && label && normName === label) return show;
    }
  }

  const fallback = { name: showName, title: showName };
  if (normId && !/^\d+$/.test(normId)) fallback.maxId = normId;
  else if (normId && /^\d+$/.test(normId)) fallback.id = normId;
  return fallback;
}

function buildRecentlyWatchedMaxCardHtml(entry, description) {
  const posterUrl = buildPosterUrl(entry.poster_path, 'w300');
  const rawShowName = stripServiceSuffixFromShowName(entry.show_name);
  const showTitle = escapeHtml(formatRecentlyWatchedCardTitle(entry));
  const episodeLabel = escapeHtml(formatRecentlyWatchedEpisodeLabel(entry));
  const time = escapeHtml(formatRelativeWatchTime(entry.watched_at));
  const showId = entry.show_id != null ? String(entry.show_id) : '';
  const showIdAttr = encodeURIComponent(showId);
  const showNameAttr = encodeURIComponent(rawShowName);
  const maxUrlAttr = encodeURIComponent(getRecentlyWatchedMaxUrlFromEntry(entry));
  const showKey = getRecentlyWatchedPosterKey(rawShowName);
  const thumbHtml = buildDeferredPosterHtml(
    showKey,
    posterUrl,
    'width:100%;height:100%;object-fit:cover;background:#1a1a1a;pointer-events:none;'
  );
  const descHtml = description
    ? `<div class="ep-card-h-meta" style="margin-top:6px;color:var(--text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35;pointer-events:none;">${escapeHtml(description)}</div>`
    : '';
  return `<div class="ep-card-h recently-watched-card" data-recently-watched-show-id="${showIdAttr}" data-recently-watched-show-name="${showNameAttr}" data-recently-watched-max-url="${maxUrlAttr}" style="width:240px;">
    <div class="recently-watched-card-thumb" style="width:100%;aspect-ratio:16/9;background:#1a1a1a;overflow:hidden;flex-shrink:0;pointer-events:none;">${thumbHtml}</div>
    <div class="ep-card-h-body" style="pointer-events:none;">
      <div class="ep-card-h-name" style="pointer-events:none;">${showTitle}</div>
      ${episodeLabel ? `<div class="ep-card-h-code" style="pointer-events:none;">${episodeLabel}</div>` : ''}
      <div class="ep-card-h-meta" style="pointer-events:none;">${time}</div>
      ${descHtml}
    </div>
  </div>`;
}

async function buildRecentlyWatchedMaxCardsHtml(entries) {
  const cards = await Promise.all((entries || []).map(async entry => {
    const description = await fetchTmdbEpisodeOverview(
      entry.show_id,
      entry.season_num,
      entry.episode_number
    );
    return buildRecentlyWatchedMaxCardHtml(entry, description);
  }));
  return cards.join('');
}

function getPlaylistsFromBridge() {
  return new Promise((resolve) => {
    // If bridge has already exposed playlists on window, use them
    if (window.shufflrPlaylists && Array.isArray(window.shufflrPlaylists)) {
      return resolve(window.shufflrPlaylists);
    }

    // Otherwise, send a message to the bridge and wait for the response
    const handler = (event) => {
      if (event.source !== window) return;
      if (event.data && event.data.type === 'SHUFFLR_PLAYLISTS_RESPONSE') {
        window.removeEventListener('message', handler);
        resolve(event.data.playlists || []);
      }
    };
    window.addEventListener('message', handler);

    // Request playlists from the bridge
    window.postMessage({ type: 'SHUFFLR_GET_PLAYLISTS' }, '*');

    // Timeout after 2 seconds in case bridge isn't connected
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve([]);
    }, 2000);
  });
}

// Builds the "Your Playlists" horizontal scroll row filtered by the connected streaming service.
async function buildYourPlaylistsHtml() {
  const connectedService = localStorage.getItem('shufflr_service') || 'max';
  const bridgePlaylists = await getPlaylistsFromBridge();
  const allPlaylists = bridgePlaylists || playlists || [];
  homePlaylistsCache = allPlaylists;
  const displayPlaylists = allPlaylists.filter(p => (p.service || 'max') === connectedService);
  if (!displayPlaylists.length) {
    return `
    <div class="genre-section" style="margin-top:16px;">
      <div class="genre-title">-- YOUR PLAYLISTS --</div>
      <div class="pl-empty-state"><p>No playlists yet.</p><p>On Max, hit the Shufflr button and use the playlist dropdown to create one. It will appear here automatically.</p></div>
    </div>`;
  }

  const cards = displayPlaylists.map((playlist) => {
    const index = allPlaylists.indexOf(playlist);
    const playlistItems = playlist.shows || [];
    const itemCount = playlistItems.length;
    const countLabel = `${itemCount} show${itemCount !== 1 ? 's' : ''}`;
    const posterHtml = buildPlaylistCoverPosterHtml(playlist, index);

    return `
      <div class="pl-home-card" data-pl-index="${index}" data-pl-id="${playlist.id || ''}" data-pl-name="${encodeURIComponent(playlist.name || '')}">
        <div class="pl-home-poster" onclick="togglePlaylistDrawer(${index})">
          ${posterHtml}
          <button class="pl-home-camera-btn" onclick="event.stopPropagation();triggerPlaylistPosterPicker('${playlist.id || playlist.name}')" aria-label="Change playlist poster">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="4" width="14" height="10" rx="1" stroke="white" stroke-width="1.5" fill="none"/>
              <circle cx="8" cy="9" r="2.5" stroke="white" stroke-width="1.5" fill="none"/>
              <rect x="5" y="2" width="6" height="2" rx="1" fill="white"/>
            </svg>
          </button>
        </div>
        <div class="pl-home-info" onclick="togglePlaylistDrawer(${index})">
          <div class="pl-home-name">${playlist.name || 'Untitled'}</div>
          <div class="pl-home-count">${countLabel}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="genre-section pl-home-section" style="margin-top:16px;">
      <div class="genre-title">-- YOUR PLAYLISTS --</div>
      <div class="h-scroll-wrap">${cards}</div>
      <div class="pl-home-drawer" id="pl-home-drawer" hidden></div>
    </div>`;
}

async function buildRecentlyWatchedOnMaxHtml(entries){
  if (!entries?.length) {
    return `<div class="genre-section" style="margin-top:16px;">
      <div class="genre-title">-- RECENTLY WATCHED ON MAX --</div>
      <div class="empty-state" style="padding:12px 0;"><div class="empty-sub">Start watching on Max to see your history here.</div></div>
    </div>`;
  }
  return `<div class="genre-section" style="margin-top:16px;">
    <div class="genre-title">-- RECENTLY WATCHED ON MAX --</div>
    <div class="h-scroll-wrap">${await buildRecentlyWatchedMaxCardsHtml(entries)}</div>
  </div>`;
}

async function loadRecentlyWatchedOnMaxSection(allPlaylists=playlists){
  if(typeof window.shufflrGetWatchHistory!=='function')return{html:'',entries:[]};
  try{
    const entries=dedupeWatchHistoryByShowId(await window.shufflrGetWatchHistory(200));
    return{html:await buildRecentlyWatchedOnMaxHtml(entries),entries};
  }catch(e){
    console.error('[Shufflr] Failed to load watch history:',e);
    return{html:'',entries:[]};
  }
}

function savePlaylists(){
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY,JSON.stringify(playlists));
  window.dispatchEvent(new CustomEvent('shufflr-playlists-sync',{detail:playlists}));
  window.postMessage({type:'SHUFFLR_SYNC_PLAYLISTS',source:'shufflr-web',playlists},'*');
  try{
    if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
      chrome.storage.local.set({[SHUFFLR_PLAYLISTS_KEY]:playlists});
    }
  }catch(e){}
  if(typeof window.shufflrSyncPlaylistsToCloud==='function'){
    window.shufflrSyncPlaylistsToCloud(playlists);
  }
}
let highlightedEps=[];
let cameFromFree=false,freeScrollPos=0;
let lastShowNav={shows:null,movies:null};
let homeNavType='shows',homeScrollPos=0;
let _timerInterval=null,_timerSecondsLeft=0,_timerTotalSeconds=0;
let _timerEp=null,_timerNextEp=null;
let _timerStartTimestamp=null,_timerPhase=null;
let _timerBufferSecs=10,_timerRuntimeSecs=60,_timerNotifAt=10;
let _timerNotifScheduled=false,_timerNotifTimeout=null;

// LOADING
window.addEventListener('load',()=>{
  detectRegion();
  setTimeout(()=>{
    const ls=document.getElementById('loading-screen');
    ls.style.transition='opacity 0.5s';ls.style.opacity='0';
    setTimeout(()=>{
      ls.style.display='none';
      if(!localStorage.getItem('shufflr_onboarded')) document.getElementById('onboarding').style.display='flex';
      updateConnectBtnLabel();
      renderHomeScreen('shows');
      // Ask for notification permission on load (like a normal app)
      askNotifPermissionOnLoad();
    },500);
  },2200);
});

// KEYBOARD SHORTCUT
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&e.target.tagName!=='INPUT'){e.preventDefault();triggerShuffle();}
  if(e.code==='KeyS'&&e.target.tagName!=='INPUT'){document.getElementById('search-input').focus();}
});

// ONBOARDING
const obSteps=[
  {step:'STEP 1 OF 4',title:'SEARCH ANY SHOW OR MOVIE',desc:"Shufflr doesn't stream. We help you decide. Type any show or movie into the search bar and select it to load all its episodes instantly."},
  {step:'STEP 2 OF 4',title:'HIT SHUFFLE',desc:'Press the shuffle arrows or hit Space on your keyboard to get 3 random episode picks from your show.'},
  {step:'STEP 3 OF 4',title:'FILTER & BUILD PLAYLISTS',desc:'Use the rating slider to filter top episodes, block seasons, and build playlists across multiple shows.'},
  {step:'STEP 4 OF 4',title:'PICK YOUR SERVICE',desc:'Which streaming service do you use most? Episode links will open there. You can change this any time in settings.', picker:true},
];
let obIndex=0;
function nextOnboard(){
  obIndex++;
  if(obIndex>=obSteps.length){closeHelp();localStorage.setItem('shufflr_onboarded','1');return;}
  const s=obSteps[obIndex];
  document.getElementById('ob-step').textContent=s.step;
  document.getElementById('ob-title').textContent=s.title;
  document.getElementById('ob-desc').textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===obIndex));
  if(s.picker){
    document.getElementById('ob-desc').innerHTML=s.desc;
    document.getElementById('ob-service-picker').style.display='grid';
    document.querySelector('.onboard-btn').textContent='DONE';
    // pre-select saved
    const saved=localStorage.getItem('shufflr_service')||'netflix';
    document.querySelectorAll('.ob-service-btn').forEach(b=>b.classList.toggle('selected',b.dataset.svc===saved));
  } else {
    document.getElementById('ob-service-picker').style.display='none';
    if(obIndex===obSteps.length-2) document.querySelector('.onboard-btn').textContent='NEXT';
  }
}
function pickObService(el, svc){
  localStorage.setItem('shufflr_service', svc);
  document.querySelectorAll('.ob-service-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
}

// THEME
function toggleTheme(){
  isLightMode=!isLightMode;
  document.body.classList.toggle('light-mode',isLightMode);
  document.getElementById('theme-btn').textContent=isLightMode?'Light':'Dark';
}

// CONNECT
function openConnect(){
  // Restore saved selection
  const saved=localStorage.getItem('shufflr_service');
  document.querySelectorAll('#service-list .service-connect-btn').forEach(b=>{
    const svc=b.closest('.service-row').dataset.svc;
    if(svc===saved){b.textContent='Connected';b.classList.add('connected');}
    else{b.textContent='Connect';b.classList.remove('connected');}
  });
  document.getElementById('connect-modal').classList.add('open');
}
function closeConnect(){document.getElementById('connect-modal').classList.remove('open');}
function selectService(btn, svc){
  // Deselect all
  document.querySelectorAll('#service-list .service-connect-btn').forEach(b=>{
    b.textContent='Connect';b.classList.remove('connected');
  });
  // Select this one
  localStorage.setItem('shufflr_service', svc);
  btn.textContent='Connected';
  btn.classList.add('connected');
  // Update sidebar button label
  updateConnectBtnLabel();
}
function updateConnectBtnLabel(){
  const saved=localStorage.getItem('shufflr_service');
  const names={netflix:'Netflix',max:'Max',hulu:'Hulu',disney:'Disney+',prime:'Prime Video',tubi:'Tubi',peacock:'Peacock',paramount:'Paramount+',appletv:'Apple TV+',crunchyroll:'Crunchyroll'};
  const btn=document.getElementById('service-connect-btn');
  if(!btn) return;
  if(saved&&names[saved]){
    btn.innerHTML=`<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#22c55e;box-shadow:0 0 5px #22c55e;margin-right:7px;vertical-align:middle;flex-shrink:0;"></span>${names[saved]} Connected`;
  } else {
    btn.innerHTML='Connect Your Service';
  }
  btn.style.borderColor='';
  btn.style.color='';
  btn.style.boxShadow='';
}

function updateSeasonsSidebarVisibility(hasSeasons){
  const block=document.getElementById('seasons-sidebar-block');
  if(block)block.style.display=hasSeasons?'':'none';
}

function clearSeasonsSidebar(){
  document.getElementById('seasons-list').innerHTML='';
  updateSeasonsSidebarVisibility(false);
}

// NAV
function setNav(nav){
  if(nav==='movies'||nav==='free')return;
  currentNav=nav;
  ['shows','playlist','options'].forEach(n=>{
    const el=document.getElementById('nav-'+n);
    if(el) el.classList.toggle('active',n===nav);
  });
  if(nav==='playlist'){
    allSeasons=[];
    clearSeasonsSidebar();
    renderPlaylistPage();
  }else if(nav==='options'){
    allSeasons=[];
    clearSeasonsSidebar();
    renderOptionsPage();
  }else if(nav==='shows'){
    currentType='tv';
    currentShow=null; allSeasons=[]; allEpisodes={}; highlightedEps=[];
    clearSeasonsSidebar();
    document.getElementById('search-input').value='';
    homeScrollPos=0;
    lastShowNav={shows:null,movies:null};
    renderHomeScreen('shows');
  }
}

function _restoreShow(show,type){
  currentType=type;
  document.getElementById('search-input').value=show.name||show.title||'';
  currentShow=show;
  if(type==='tv') loadSeasons(show.id);
  else renderMovieMain(show);
}

// SEARCH
function handleSearch(){
  const q=document.getElementById('search-input').value.trim();
  const drop=document.getElementById('dropdown');
  clearTimeout(searchTimer);
  if(!q){showRecent();return;}
  searchTimer=setTimeout(()=>doSearch(q),350);
}

function showRecent(){
  const drop=document.getElementById('dropdown');
  if(document.getElementById('search-input').value.trim()){return;}
  const filtered=recentShows.filter(s=>!s.release_date);
  if(!filtered.length){drop.classList.remove('open');return;}
  drop.innerHTML='<div class="recent-label">Recent Searches</div>'+
    filtered.slice(0,5).map((s,i)=>`
      <div class="recent-item" onclick="selectRecent(${recentShows.indexOf(s)})">
        <img class="recent-img" src="${s.poster_path?IMG+'w92'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <span>${s.name||s.title}</span>
      </div>`).join('');
  openDropdown();
}

async function doSearch(q){
  const type='tv';
  try{
    const r=await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${KEY}&query=${encodeURIComponent(q)}`);
    const d=await r.json();
    const results=(d.results||[]).slice(0,7);
    const drop=document.getElementById('dropdown');
    if(!results.length){drop.classList.remove('open');return;}
    drop._results=results;
    drop.innerHTML=results.map((s,i)=>`
      <div class="result-item" onclick="selectShow(${i})">
        <img class="result-img" src="${s.poster_path?IMG+'w92'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <div><div class="result-name">${s.name||s.title}</div>
        <div class="result-year">${((s.first_air_date||s.release_date)||'').slice(0,4)} | ${s.vote_average?s.vote_average.toFixed(1)+'/10':'N/A'}</div></div>
      </div>`).join('');
    openDropdown();
  }catch(e){console.error(e);}
}

async function selectShow(i){
  const drop=document.getElementById('dropdown');
  const show=drop._results[i];
  closeSearch();
  _loadShow(show);
}

function selectRecent(i){_loadShow(recentShows[i]);}

async function _loadShow(show){
  document.getElementById('search-input').value=show.name||show.title||'';
  document.getElementById('dropdown').classList.remove('open');
  currentShow=show;
  blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
  recentShows=[show,...recentShows.filter(s=>s.id!==show.id)].slice(0,10);
  localStorage.setItem('shufflr_recent',JSON.stringify(recentShows));
  if(show.media_type==='movie'||show.release_date){
    currentType='movie';
    lastShowNav.movies=show;
    renderMovieMain(show);
  } else {
    currentType='tv';
    lastShowNav.shows=show;
    await loadSeasons(show.id);
  }
}

// SEASONS
async function loadSeasons(id){
  showMain('<div class="empty-state"><div class="empty-title" style="animation:blink 0.8s infinite">LOADING...</div></div>');
  try{
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const d=await r.json();
    allSeasons=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0);
    currentShow={...currentShow,...d};
    renderSeasonsSidebar();
    await renderMain();

  }catch(e){console.error(e);}
}

function renderSeasonsSidebar(){
  const el=document.getElementById('seasons-list');
  if(!allSeasons.length){
    clearSeasonsSidebar();
    return;
  }
  updateSeasonsSidebarVisibility(true);
  el.innerHTML=allSeasons.map(s=>`
    <div class="season-item ${selectedSeason===s.season_number?'active':''} ${blockedSeasons.has(s.season_number)?'blocked':''}"
         onclick="selectSeason(${s.season_number})">
      <div class="nav-dot"></div>
      S${String(s.season_number).padStart(2,'0')}
      <button class="block-btn" onclick="toggleBlock(event,${s.season_number})" title="Block season">✕</button>
    </div>`).join('');
}

function toggleBlock(e,num){
  e.stopPropagation();
  if(blockedSeasons.has(num))blockedSeasons.delete(num);
  else{blockedSeasons.add(num);if(selectedSeason===num)selectedSeason=null;}
  renderSeasonsSidebar();renderMain();
}

async function selectSeason(num){
  if(blockedSeasons.has(num))return;
  selectedSeason=selectedSeason===num?null:num;
  renderSeasonsSidebar();await renderMain();
}

// RATING
function getRatingHTML(){
  return `<div class="rating-bar">
    <div class="rating-top">
      <span class="rating-title">Min Rating</span>
      <span class="rating-value" id="rating-display">${minRating===0?'ANY':minRating.toFixed(1)+'+'}</span>
    </div>
    <input type="range" id="rating-slider" min="0" max="10" step="0.1" value="${minRating}"
      oninput="updateRating(this.value)" style="--pct:${minRating*10}%" />
    <div class="slider-labels"><span>Any</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10</span></div>
  </div>`;
}

function updateRating(val){
  minRating=parseFloat(val);
  const s=document.getElementById('rating-slider');
  if(s)s.style.setProperty('--pct',(minRating*10)+'%');
  const d=document.getElementById('rating-display');
  if(d)d.textContent=minRating===0?'ANY':minRating.toFixed(1)+'+';
  // Filter compact episode rows live
  document.querySelectorAll('.ep-compact[data-rating]').forEach(row=>{
    const show=minRating===0||(parseInt(row.dataset.votes||0)>=3&&parseFloat(row.dataset.rating)>=minRating);
    row.style.display=show?'':'none';
  });
  // Also filter legacy ep-row elements if any
  document.querySelectorAll('.ep-row[data-rating]').forEach(row=>{
    const show=minRating===0||(parseInt(row.dataset.votes||0)>=3&&parseFloat(row.dataset.rating)>=minRating);
    row.style.display=show?'':'none';
  });
  // Hide entire season blocks if all their episodes are hidden
  document.querySelectorAll('.ep-season-block').forEach(block=>{
    const anyVisible=Array.from(block.querySelectorAll('.ep-compact[data-rating], .ep-row[data-rating]')).some(r=>r.style.display!=='none');
    block.style.display=anyVisible?'':'none';
  });
}

// PRESS & PLAY
function pressAndPlay(){
  const url=getEpLink();
  window.open(url,'_blank');
  // If queue exists, start timer for episode #1
  if(highlightedEps.length){
    const ep=highlightedEps[0];
    _timerEp={
      name:ep.name||'Episode',
      code:`S${String(ep.seasonNum||'').padStart(2,'0')} E${String(ep.episode_number||'').padStart(2,'0')}`,
      runtime:ep.runtime||45,
    };
    _timerNextEp=highlightedEps.length>1?highlightedEps[1]:getNextEpisode(ep);
    // TEST MODE: 10s buffer, 60s runtime
    const runtimeSecs=60;
    startTimerPhase1(runtimeSecs);
  }
}

// SHUFFLE
function triggerShuffle(){
  if(!currentShow||currentNav==='playlist')return;
  // Spin all shuffle-btn icons
  document.querySelectorAll('.shuffle-btn').forEach(b=>{b.classList.add('spinning');b.disabled=true;});
  renderMain(true).then(()=>{
    document.querySelectorAll('.shuffle-btn').forEach(b=>{b.classList.remove('spinning');b.disabled=false;});
    // Scroll queue into view smoothly
    const qw=document.getElementById('queue-wrap');
    if(qw) qw.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
}

// SHOW HERO HTML
function getHeroHTML(show,type){
  const isAdded=playlists.some(p=>p.shows.some(s=>s.id===show.id));
  const poster=show.poster_path?IMG+'w185'+show.poster_path:'';
  const title=show.name||show.title||'';
  const year=((show.first_air_date||show.release_date)||'').slice(0,4);
  const rating=show.vote_average?show.vote_average.toFixed(1)+'/10':'N/A';
  const overview=show.overview||'';
  const oid='ov-'+show.id;
  return `<div class="show-hero">
    <button class="add-playlist-btn ${isAdded?'added':''}" onclick="openPlaylistModal()" title="${isAdded?'Added to playlist':'Add to playlist'}">
      ${isAdded
        ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 11 15 16 9"></polyline></svg>`
        :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`
      }
    </button>
    <img class="show-hero-poster" src="${poster}" onerror="this.style.background='#1a1a1a'" />
    <div class="show-hero-info">
      <div class="show-hero-title">${title}</div>
      <div class="show-hero-meta">
        <span>${year}</span>
        <span>${rating}</span>
        ${type==='tv'&&show.number_of_seasons?`<span>${show.number_of_seasons} Season${show.number_of_seasons!==1?'s':''}</span>`:''}
        ${type==='movie'&&show.runtime?`<span>${show.runtime} min</span>`:''}
      </div>
      <div id="${oid}" style="font-size:0.76rem;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${overview}</div>
      ${overview.length>120?`<button onclick="toggleOv('${oid}',this)" style="background:none;border:none;color:var(--blue);font-size:0.7rem;padding:2px 0 4px;cursor:pointer;font-family:'DM Sans',sans-serif;">Read more</button>`:''}
    </div>
  </div>
  <div id="providers-container" class="wtw-box">
    <div class="wtw-loading">Loading where to watch...</div>
  </div>`;
}

function toggleOv(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  const clamped=el.style.webkitLineClamp!=='unset';
  el.style.webkitLineClamp=clamped?'unset':'3';
  el.style.overflow=clamped?'visible':'hidden';
  btn.textContent=clamped?'Read less':'Read more';
}

// MOVIES
async function renderMovieMain(show){
  allSeasons=[];
  clearSeasonsSidebar();
  try{
    const r=await fetch(`https://api.themoviedb.org/3/movie/${show.id}?api_key=${KEY}`);
    const d=await r.json();
    currentShow={...show,...d};
  }catch(e){}
  const showName=currentShow.title||currentShow.name||'';
  const fallbackLink=getEpLink();
  const backBtn=`<button class="back-btn" onclick="goBackHome()">
    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    Back
  </button>`;
  const html=backBtn+getHeroHTML(currentShow,'movie')+
  `<div class="shuffle-result-card" style="margin-top:4px;">
    ${currentShow.backdrop_path?`<img class="shuffle-result-still" src="${IMG+'w780'+currentShow.backdrop_path}" />`:''}
    <div class="shuffle-result-body">
      <div class="shuffle-result-label">MOVIE</div>
      <div class="shuffle-result-title">${showName}</div>
      <div class="shuffle-result-meta">
        <span>${((currentShow.release_date)||'').slice(0,4)}</span>
        ${currentShow.runtime?`<span>${currentShow.runtime} min</span>`:''}
        ${currentShow.vote_average>0?`<span>${currentShow.vote_average.toFixed(1)}/10</span>`:''}
        ${currentShow.genres?currentShow.genres.slice(0,2).map(g=>`<span>${g.name}</span>`).join(''):''}
      </div>
      <div class="shuffle-result-overview">${currentShow.overview||''}</div>
    </div>
  </div>`;
  showMain(html);
  // Load providers into the hero card
  fetchProviders(currentShow.id,'movie',showName).then(pd=>{
    const el=document.getElementById('providers-container');
    if(!el)return;
    el.innerHTML=pd ? (buildProviderHTML(pd,showName)||buildFallbackProviders(showName)) : buildFallbackProviders(showName);
  }).catch(()=>{
    const el=document.getElementById('providers-container');
    if(el) el.innerHTML=buildFallbackProviders(showName);
  });
}

// MAIN TV RENDER
async function renderMain(doShuffle=false){
  return new Promise(async(resolve)=>{
  if(!currentShow||currentType!=='tv')return;
  showMain('<div class="empty-state"><div class="empty-title" style="animation:blink 0.8s infinite">LOADING...</div></div>');
  const seasonsToLoad=selectedSeason
    ?allSeasons.filter(s=>s.season_number===selectedSeason)
    :allSeasons.filter(s=>!blockedSeasons.has(s.season_number));
  for(const s of seasonsToLoad){
    if(!allEpisodes[s.season_number]){
      try{
        const r=await fetch(`https://api.themoviedb.org/3/tv/${currentShow.id}/season/${s.season_number}?api_key=${KEY}`);
        const d=await r.json();
        allEpisodes[s.season_number]=d.episodes||[];
      }catch(e){}
    }
  }
  let flatEps=[];
  for(const s of seasonsToLoad)flatEps=flatEps.concat((allEpisodes[s.season_number]||[]).map(e=>({...e,seasonNum:s.season_number})));
  const filtered=flatEps.filter(e=>minRating===0||(e.vote_count>=3&&e.vote_average>=minRating));
  if(doShuffle&&filtered.length){
    const shuffled=[...filtered].sort(()=>Math.random()-0.5);
    highlightedEps=shuffled.slice(0,Math.min(3,shuffled.length));
  }

  let html=`<button class="back-btn" onclick="goBackHome()">
    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
    Back
  </button>`;
  html+=getHeroHTML(currentShow,'tv');
  html+=getRatingHTML();
  html+=`<div style="display:flex;gap:10px;align-items:center;margin-bottom:20px;">
    <button class="shuffle-btn" onclick="triggerShuffle()" title="Shuffle episodes (Space)">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line>
        <polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line>
      </svg>SHUFFLE
    </button>
    <button class="shuffle-btn" id="play-btn" onclick="pressAndPlay()" style="background:var(--blue);color:#000;border-color:var(--blue);flex-shrink:0;flex:0 0 auto;padding:13px 18px;" title="Open your connected streaming service">
      ▶ PLAY
    </button>
  </div>`;

  if(highlightedEps.length){
    html+=`<div class="queue-wrap" id="queue-wrap">
      <div class="queue-header">
        <div class="queue-label">▶ UP NEXT</div>

      </div>`;
    highlightedEps.forEach((e,i)=>{
      const code=`S${String(e.seasonNum).padStart(2,'0')} · E${String(e.episode_number).padStart(2,'0')}`;
      const meta=[];
      if(e.vote_average>0) meta.push(e.vote_average.toFixed(1)+'/10');
      if(e.runtime) meta.push(e.runtime+' min');
      html+=`<div class="queue-item" onclick="openEpSheet(${e.episode_number},${e.seasonNum})">
        <div class="queue-num">${i+1}</div>
        <div class="queue-info">
          <div class="queue-ep-code">${code}</div>
          <div class="queue-ep-title">${e.name||'Episode '+e.episode_number}</div>
          ${meta.length?`<div class="queue-ep-meta">${meta.join(' · ')}</div>`:''}
        </div>
        <div class="queue-arrow">›</div>
      </div>`;
    });
    html+=`</div>`;
  }

  const seasonGroups={};
  flatEps.forEach(e=>{if(!seasonGroups[e.seasonNum])seasonGroups[e.seasonNum]=[];seasonGroups[e.seasonNum].push(e);});
  Object.keys(seasonGroups).map(Number).sort((a,b)=>a-b).forEach(sNum=>{
    const seasonEps=seasonGroups[sNum];
    const watchedCount=seasonEps.filter(e=>{
      const key=`${currentShow.id}-s${e.seasonNum}e${e.episode_number}`;
      return watchHistory.some(h=>h.key===key);
    }).length;
    const pct=seasonEps.length>0?Math.round((watchedCount/seasonEps.length)*100):0;
    html+=`<div class="ep-season-block">
      <div class="ep-season-header">
        <div class="section-header" style="margin-bottom:6px;">SEASON ${String(sNum).padStart(2,'0')}</div>
        <div class="season-progress-wrap" style="margin-bottom:0;">
          <div class="season-progress-bar"><div class="season-progress-fill" style="width:${pct}%"></div></div>
          <div class="season-progress-label">${watchedCount} / ${seasonEps.length} watched</div>
        </div>
      </div>
      <div class="ep-season-list">`;
    seasonGroups[sNum].forEach(e=>{html+=renderEpRow(e);});
    html+=`</div></div>`;
  });
  if(!flatEps.length)html+=`<div class="empty-state"><div class="empty-sub">No episodes found. Try a lower rating.</div></div>`;
  showMain(html);
  const _tvShowName=currentShow.name||currentShow.title||'';
  const _tvProviderTimeout=setTimeout(()=>{
    const el=document.getElementById('providers-container');
    if(el&&el.querySelector('.wtw-loading')) el.innerHTML=buildFallbackProviders(_tvShowName);
  },5000);
  fetchProviders(currentShow.id,'tv',_tvShowName).then(pd=>{
    clearTimeout(_tvProviderTimeout);
    const el=document.getElementById('providers-container');
    if(!el)return;
    el.innerHTML=pd ? (buildProviderHTML(pd,_tvShowName)||buildFallbackProviders(_tvShowName)) : buildFallbackProviders(_tvShowName);
  }).catch(()=>{
    clearTimeout(_tvProviderTimeout);
    const el=document.getElementById('providers-container');
    if(el) el.innerHTML=buildFallbackProviders(_tvShowName);
  });
  resolve();
  });
}

function getEpLink(){
  const saved=localStorage.getItem('shufflr_service');
  const map={
    netflix:'https://www.netflix.com',
    max:'https://play.max.com',
    hulu:'https://www.hulu.com',
    disney:'https://www.disneyplus.com',
    prime:'https://www.amazon.com/prime-video',
    tubi:'https://tubitv.com',
    peacock:'https://www.peacocktv.com',
    paramount:'https://www.paramountplus.com',
    appletv:'https://tv.apple.com',
    crunchyroll:'https://www.crunchyroll.com',
  };
  return map[saved]||'https://www.netflix.com';
}

let _currentSheetEp=null;
let _pendingEp=null; // episode being added to playlist (null = adding show)

function renderEpRow(e){
  const key=`${currentShow.id}-s${e.seasonNum}e${e.episode_number}`;
  const watched=watchHistory.some(h=>h.key===key);
  const isHL=highlightedEps.some(h=>h.id===e.id);
  return `<div class="ep-compact${isHL?' highlighted':''}${watched?' watched':''}"
    data-rating="${e.vote_average||0}" data-votes="${e.vote_count||0}" data-key="${key}"
    onclick="openEpSheet(${e.episode_number},${e.seasonNum})">
    <div class="ep-compact-num">E${String(e.episode_number).padStart(2,'0')}</div>
    <div class="ep-compact-title">${e.name||'Episode '+e.episode_number}</div>
    ${watched?'<div class="ep-compact-check">\u2713</div>':''}
  </div>`;
}

function openEpSheet(epNum, seasonNum){
  const eps=allEpisodes[seasonNum]||[];
  const e=eps.find(ep=>ep.episode_number===epNum);
  if(!e)return;
  _currentSheetEp=e;
  const key=`${currentShow.id}-s${seasonNum}e${epNum}`;
  markWatched(key,currentShow.name||currentShow.title||'',e.name||'',seasonNum,epNum,currentShow.poster_path||'');
  document.getElementById('ep-sheet-code').textContent=`S${String(seasonNum).padStart(2,'0')}  E${String(epNum).padStart(2,'0')}`;
  document.getElementById('ep-sheet-title').textContent=e.name||'Episode '+epNum;
  const meta=[];
  if(e.vote_average>0) meta.push(e.vote_average.toFixed(1)+'/10');
  if(e.runtime) meta.push(e.runtime+' min');
  if(e.air_date) meta.push(e.air_date.slice(0,4));
  document.getElementById('ep-sheet-meta').textContent=meta.join('  \u00b7  ');
  document.getElementById('ep-sheet-overview').textContent=e.overview||'No description available.';
  document.getElementById('ep-sheet').classList.add('open');
  document.getElementById('ep-sheet-overlay').classList.add('open');
}

function closeEpSheet(){
  document.getElementById('ep-sheet').classList.remove('open');
  document.getElementById('ep-sheet-overlay').classList.remove('open');
  _currentSheetEp=null;
}

function epSheetWatch(){
  window.open(getEpLink(),'_blank');
}

function epSheetAddToPlaylist(){
  // Pass the current episode so playlist knows to add episode, not show
  const ep=_currentSheetEp;
  closeEpSheet();
  openPlaylistModal(ep);
}


function markWatched(key,showName,epName,season,epNum,poster){
  if(!watchHistory.some(h=>h.key===key)){
    watchHistory.push({key,showName,epName,season,epNum,poster,date:new Date().toLocaleDateString()});
    localStorage.setItem('shufflr_history',JSON.stringify(watchHistory));
  }
}

function shareEp(e,url){
  e.preventDefault();e.stopPropagation();
  navigator.clipboard.writeText(url).then(()=>showToast('LINK COPIED'));
}

// PLAYLISTS PAGE
function getPlaylistAddShowSection(){
  return `<div class="pl-add-show-section">
    <span class="pl-coming-soon-badge">Coming Soon</span>
    <button class="pl-add-show-btn" type="button" disabled aria-disabled="true">+ Add Show</button>
    <p class="pl-add-show-hint">Add shows directly from Max using the + button in the Shufflr dropdown</p>
  </div>`;
}

function renderPlaylistPage(){
  let html=`<div class="playlist-page-header">
    <div class="playlist-page-title">MY PLAYLISTS</div>
  </div>
  <div class="new-pl-row">
    <input class="new-pl-input" id="inline-pl-input" placeholder="New playlist name..." />
    <button class="new-pl-btn" onclick="createInlinePlaylist()">+ Create</button>
  </div>`;
  if(!playlists.length){
    html+=`<div class="empty-state"><div class="empty-sub">No playlists yet.<br>Create one above, then add shows from Max using the + button in the Shufflr dropdown.</div></div>`;
    html+=getPlaylistAddShowSection();
  } else {
    html+=playlists.map((p,pi)=>`
      <div class="pl-card">
        <div class="pl-card-header">
          <div>
            <div class="pl-card-name">${p.name}</div>
            <div class="pl-card-count">${(p.shows||[]).length+(p.episodes||[]).length} item${((p.shows||[]).length+(p.episodes||[]).length)!==1?'s':''}</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="pl-shuffle-btn" onclick="sharePlaylist(${pi})" style="border-color:var(--muted);color:var(--muted);">
              <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
              SHARE
            </button>
            <button class="pl-shuffle-btn" onclick="playPlaylist(${pi})" style="background:var(--blue);color:#000;border-color:var(--blue);" title="Open your connected streaming service">
              ▶ PLAY
            </button>
            <button class="pl-delete-btn" onclick="deletePlaylist(${pi})">Delete</button>
          </div>
        </div>
        ${(()=>{
          const shows=(p.shows||[]);
          const episodes=(p.episodes||[]);
          if(!shows.length&&!episodes.length) return '<div class="pl-empty">Nothing added yet.</div>';
          let rows='';
          shows.forEach((s,si)=>{
            rows+=`<div class="pl-show-row" draggable="true"
              ondragstart="dragStart(event,${pi},${si},'show')"
              ondragover="dragOver(event)"
              ondragleave="dragLeave(event)"
              ondrop="dragDrop(event,${pi},${si})"
              ondragend="dragEnd(event)">
              <span class="drag-handle">⠿</span>
              <img class="pl-show-img" src="${s.poster_path?IMG+'w92'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
              <div style="flex:1;min-width:0;">
                <div class="pl-show-name">${s.name||s.title}</div>
                <div class="pl-show-year">${((s.first_air_date||s.release_date)||'').slice(0,4)} · Full Show</div>
              </div>
              <button class="pl-remove-btn" onclick="removeShowFromPlaylist(${pi},${si})" title="Remove">✕</button>
            </div>`;
          });
          episodes.forEach((e,ei)=>{
            const code=`S${String(e.seasonNum||'?').padStart(2,'0')} E${String(e.episode_number||'?').padStart(2,'0')}`;
            rows+=`<div class="pl-show-row">
              <span class="drag-handle" style="color:#23A8E0;font-size:0.6rem;width:18px;text-align:center;">▶</span>
              <img class="pl-show-img" src="${e.showPoster?IMG+'w92'+e.showPoster:''}" onerror="this.style.background='#1a1a1a'" style="opacity:0.75;" />
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.58rem;color:var(--blue);font-weight:700;letter-spacing:1px;margin-bottom:1px;">${code}</div>
                <div class="pl-show-name" style="font-size:0.82rem;">${e.name||'Episode'}</div>
                <div class="pl-show-year">${e.showName||''}</div>
              </div>
              <button class="pl-remove-btn" onclick="removeEpFromPlaylist(${pi},${ei})" title="Remove">✕</button>
            </div>`;
          });
          return rows;
        })()}
        ${getPlaylistAddShowSection()}
      </div>`).join('');
  }
  showMain(html);
}

function createInlinePlaylist(){
  const input=document.getElementById('inline-pl-input');
  const name=input.value.trim();
  if(!name)return;
  playlists.push({
    name,
    shows:[],
    // Tag playlist with service — hardcoded to 'max' until multi-service support is added.
    service: 'max',
  });
  savePlaylists();
  renderPlaylistPage();
}

function deletePlaylist(i){
  playlists.splice(i,1);
  savePlaylists();
  renderPlaylistPage();
}

function removeFromPlaylist(pi,si){
  // legacy - remove show
  if(playlists[pi].shows) playlists[pi].shows.splice(si,1);
  savePlaylists();
  renderPlaylistPage();
}
function removeShowFromPlaylist(pi,si){
  if(playlists[pi].shows) playlists[pi].shows.splice(si,1);
  savePlaylists();
  renderPlaylistPage();
}
function removeEpFromPlaylist(pi,ei){
  if(playlists[pi].episodes) playlists[pi].episodes.splice(ei,1);
  savePlaylists();
  renderPlaylistPage();
}

// Opens the Playlist tab and highlights the playlist at the given index.
function openPlaylistFromHomeCard(index) {
  setNav('playlist');
  // Small delay to let the playlist screen render before trying to expand.
  setTimeout(() => {
    const rows = document.querySelectorAll('.pl-card');
    if (rows[index]) {
      rows[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

let homePlaylistsCache = [];
let openDrawerPlaylistIndex = null;
let drawerAddShowMode = false;
let drawerAddShowAllCandidates = [];

function getPlaylistShowLabel(show) {
  return show?.title || show?.name || 'Untitled';
}

function getShowMaxUrlFromPlaylistShow(show) {
  // Prefer a saved Max URL on the show object (extension or synced entries).
  const maxUrl = show?.url || show?.maxUrl || show?.href || show?.watchUrl || null;
  if (maxUrl && String(maxUrl).includes('max.com')) {
    return String(maxUrl);
  }

  // Extension-added shows store a Max UUID as maxId — link directly to the show page.
  const maxId = show?.maxId || show?.maxShowId || show?.max_id;
  if (maxId) {
    return `https://play.max.com/show/${String(maxId)}`;
  }

  // TMDB-added shows with no Max URL — fall back to Max search.
  const query = encodeURIComponent(getPlaylistShowLabel(show));
  if (!query) return null;
  return `https://play.max.com/search?q=${query}`;
}

function setActivePlaylistViaBridge(playlist, launchUrl) {
  window.postMessage({
    type: 'SHUFFLR_SET_ACTIVE_PLAYLIST',
    playlist,
    launchUrl,
  }, '*');
}

function savePlaylistsViaBridge(allPl) {
  window.postMessage({
    type: 'SHUFFLR_SAVE_PLAYLISTS',
    playlists: allPl,
  }, '*');
}

function positionPlaylistDrawer(index) {
  const drawer = document.getElementById('pl-home-drawer');
  const card = document.querySelector(`.pl-home-card[data-pl-index="${index}"]`);
  const section = drawer?.closest('.pl-home-section');
  if (!drawer || !card || !section) return;
  const cardRect = card.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  drawer.style.left = `${Math.round(cardRect.right - sectionRect.left + 8)}px`;
}

function renderDrawerShowList(playlistIndex, playlist) {
  const body = document.getElementById('pl-drawer-body');
  if (!body) return;
  const shows = playlist.shows || [];
  body.innerHTML = shows.length
    ? shows.map((show, si) => (
      `<button type="button" class="pl-drawer-show-row" style="display:flex;align-items:center;" onclick="launchShowFromDrawer(${playlistIndex}, ${si})">
        ${buildDrawerShowThumbnailHtml(show)}
        <span class="pl-drawer-add-show-name">${escapeHtml(getPlaylistShowLabel(show))}</span>
      </button>`
    )).join('')
    : '<div class="pl-drawer-empty">No shows in this playlist.</div>';
  resolveDrawerShowPosters(shows);
}

function updatePlaylistDrawerContent(playlist, playlistIndex) {
  const drawer = document.getElementById('pl-home-drawer');
  if (!drawer) return;
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];

  drawer.innerHTML = `
    <button type="button" class="pl-drawer-close" onclick="closePlaylistDrawer()" aria-label="Close">✕</button>
    <div class="pl-drawer-title">${escapeHtml(playlist.name || 'Untitled')}</div>
    <div class="pl-drawer-actions">
      <button type="button" class="pl-drawer-btn pl-drawer-btn-primary" onclick="playRandomShowFromDrawer(${playlistIndex})">▶ Play</button>
      <button type="button" class="pl-drawer-btn pl-drawer-btn-outline" onclick="editPlaylistFromDrawer(${playlistIndex})">✎ Edit</button>
      <button type="button" class="pl-drawer-btn pl-drawer-btn-outline" onclick="openDrawerAddShowMode(${playlistIndex})">＋ Add Show</button>
    </div>
    <div class="pl-drawer-shows" id="pl-drawer-body"></div>`;
  renderDrawerShowList(playlistIndex, playlist);
}

function togglePlaylistDrawer(index) {
  if (openDrawerPlaylistIndex === index) {
    closePlaylistDrawer();
    return;
  }
  openDrawerPlaylistIndex = index;
  const drawer = document.getElementById('pl-home-drawer');
  const playlist = homePlaylistsCache[index];
  if (!drawer || !playlist) return;
  updatePlaylistDrawerContent(playlist, index);
  drawer.hidden = false;
  positionPlaylistDrawer(index);
}

function closePlaylistDrawer() {
  openDrawerPlaylistIndex = null;
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  const drawer = document.getElementById('pl-home-drawer');
  if (drawer) drawer.hidden = true;
}

function playRandomShowFromDrawer(playlistIndex) {
  const shows = homePlaylistsCache[playlistIndex]?.shows || [];
  if (!shows.length) return;
  launchShowFromDrawer(playlistIndex, Math.floor(Math.random() * shows.length));
}

function launchShowFromDrawer(playlistIndex, showIndex) {
  const playlist = homePlaylistsCache[playlistIndex];
  const show = (playlist?.shows || [])[showIndex];
  if (!playlist || !show) return;
  const launchUrl = getShowMaxUrlFromPlaylistShow(show);
  if (!launchUrl) return;
  setActivePlaylistViaBridge(playlist, launchUrl);
  window.open(launchUrl, '_blank');
  closePlaylistDrawer();
}

function editPlaylistFromDrawer(index) {
  closePlaylistDrawer();
  openPlaylistFromHomeCard(index);
}

function openDrawerAddShowMode(playlistIndex) {
  drawerAddShowMode = true;
  renderDrawerAddShowPicker(playlistIndex);
}

function getCrossPlaylistShowsForAdd(playlistIndex) {
  const currentPlaylist = homePlaylistsCache[playlistIndex];
  const seenNames = new Set();
  const candidates = [];

  homePlaylistsCache.forEach((playlist, pi) => {
    if (pi === playlistIndex) return;
    for (const show of playlist.shows || []) {
      if (isShowInPlaylist(currentPlaylist, show)) continue;
      const nameKey = normalizePlShowName(getPlaylistShowLabel(show));
      if (!nameKey || seenNames.has(nameKey)) continue;
      seenNames.add(nameKey);
      candidates.push(show);
    }
  });

  return candidates.sort((a, b) => (
    getPlaylistShowLabel(a).localeCompare(getPlaylistShowLabel(b), undefined, { sensitivity: 'base' })
  ));
}

function getDrawerAddShowPosterHtml(show) {
  const raw = show?.poster_path || show?.posterPath || show?.showPoster || show?.poster || show?.image || '';
  const text = String(raw || '').trim();
  if (!text) {
    return '<div class="pl-drawer-add-poster pl-drawer-add-poster-placeholder"></div>';
  }
  if (/^https?:\/\//i.test(text)) {
    return `<img class="pl-drawer-add-poster" src="${escapeHtml(text)}" alt="" onerror="this.outerHTML='<div class=\\'pl-drawer-add-poster pl-drawer-add-poster-placeholder\\'></div>'" />`;
  }
  const path = text.startsWith('/') ? text : `/${text}`;
  return `<img class="pl-drawer-add-poster" src="${IMG}w92${escapeHtml(path)}" alt="" onerror="this.outerHTML='<div class=\\'pl-drawer-add-poster pl-drawer-add-poster-placeholder\\'></div>'" />`;
}

function buildDrawerAddShowRowHtml(playlistIndex, candidateIndex, show) {
  return `<button type="button" class="pl-drawer-show-row pl-drawer-add-show-row" onclick="addCrossPlaylistShowToDrawer(${playlistIndex}, ${candidateIndex})">
    ${getDrawerAddShowPosterHtml(show)}
    <span class="pl-drawer-add-show-name">${escapeHtml(getPlaylistShowLabel(show))}</span>
  </button>`;
}

function filterDrawerAddShowPicker(playlistIndex) {
  const picker = document.getElementById('pl-drawer-add-picker');
  const input = document.getElementById('pl-drawer-add-filter');
  if (!picker) return;

  const q = (input?.value || '').trim().toLowerCase();
  const matches = drawerAddShowAllCandidates
    .map((show, i) => ({ show, i }))
    .filter(({ show }) => !q || getPlaylistShowLabel(show).toLowerCase().includes(q));

  if (!matches.length) {
    picker.innerHTML = '<div class="pl-drawer-empty">No matching shows.</div>';
    return;
  }

  picker.innerHTML = matches
    .map(({ show, i }) => buildDrawerAddShowRowHtml(playlistIndex, i, show))
    .join('');
}

function renderDrawerAddShowPicker(playlistIndex) {
  const body = document.getElementById('pl-drawer-body');
  if (!body) return;

  drawerAddShowAllCandidates = getCrossPlaylistShowsForAdd(playlistIndex);
  const createBtn = `<button type="button" class="pl-drawer-create-playlist-btn" onclick="createPlaylistFromDrawerAddMode(${playlistIndex})">＋ Create New Playlist</button>`;

  if (!drawerAddShowAllCandidates.length) {
    body.innerHTML = `
      <div class="pl-drawer-add-mode">
        <button type="button" class="pl-drawer-cancel-add" onclick="cancelDrawerAddShowMode(${playlistIndex})">✕ Cancel</button>
        <div class="pl-drawer-empty">Add shows from Max using the Shufflr button</div>
        ${createBtn}
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="pl-drawer-add-mode">
      <div class="pl-drawer-add-toolbar">
        <button type="button" class="pl-drawer-cancel-add" onclick="cancelDrawerAddShowMode(${playlistIndex})">✕ Cancel</button>
        <input type="text" class="pl-drawer-add-filter" id="pl-drawer-add-filter" placeholder="Filter shows..." oninput="filterDrawerAddShowPicker(${playlistIndex})" autocomplete="off" />
      </div>
      <div class="pl-drawer-add-picker" id="pl-drawer-add-picker"></div>
      ${createBtn}
    </div>`;
  filterDrawerAddShowPicker(playlistIndex);
}

async function createPlaylistFromDrawerAddMode(playlistIndex) {
  const name = await promptPlaylistName('Playlist name:');
  if (!name || !name.trim()) return;

  const newPlaylist = {
    name: name.trim(),
    shows: [],
    service: 'max',
  };

  homePlaylistsCache.push(newPlaylist);
  playlists = homePlaylistsCache;
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(playlists));
  savePlaylistsViaBridge(homePlaylistsCache);

  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  closePlaylistDrawer();
  renderHomeScreen('shows');
}

function cancelDrawerAddShowMode(playlistIndex) {
  drawerAddShowMode = false;
  drawerAddShowAllCandidates = [];
  const playlist = homePlaylistsCache[playlistIndex];
  if (playlist) renderDrawerShowList(playlistIndex, playlist);
}

function addCrossPlaylistShowToDrawer(playlistIndex, candidateIndex) {
  const show = drawerAddShowAllCandidates[candidateIndex];
  const playlist = homePlaylistsCache[playlistIndex];
  if (!show || !playlist) return;
  if (!playlist.shows) playlist.shows = [];
  if (isShowInPlaylist(playlist, show)) {
    cancelDrawerAddShowMode(playlistIndex);
    return;
  }

  playlist.shows.push({ ...show });
  if (!playlist.service) playlist.service = 'max';

  homePlaylistsCache[playlistIndex] = playlist;
  playlists = homePlaylistsCache;
  localStorage.setItem(SHUFFLR_PLAYLISTS_KEY, JSON.stringify(playlists));
  savePlaylistsViaBridge(homePlaylistsCache);
  cancelDrawerAddShowMode(playlistIndex);
}

// Triggers a file picker to set a custom poster image for a playlist, stored in localStorage as base64.
function triggerPlaylistPosterPicker(playlistKey) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      localStorage.setItem('shufflr_playlist_poster_' + playlistKey, ev.target.result);
      renderHomeScreen('shows');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ── SMART SHUFFLE + EXTENSION HANDOFF ───────────────────────────────────────
const SHUFFLR_EPISODE_STATE_KEY='shufflr_episode_state';
const SHUFFLR_SHUFFLE_SETTINGS_KEY='shufflr_shuffle_settings';

function deserializeRoundPlayedShows(serialized){
  if(!Array.isArray(serialized))return new Set();
  return new Set(serialized.map(id=>String(id)));
}
function serializeRoundPlayedShows(roundPlayedShows){
  return [...(roundPlayedShows||new Set())].map(id=>String(id));
}
async function readShuffleSettings(){
  try{
    if(typeof chrome!=='undefined'&&chrome.storage?.local){
      const stored=await new Promise(resolve=>{
        chrome.storage.local.get(SHUFFLR_SHUFFLE_SETTINGS_KEY,result=>{
          resolve(result[SHUFFLR_SHUFFLE_SETTINGS_KEY]);
        });
      });
      if(stored)return {orderedEpisodes:!!stored.orderedEpisodes};
    }
  }catch(e){}
  const local=JSON.parse(localStorage.getItem(SHUFFLR_SHUFFLE_SETTINGS_KEY)||'{}');
  return {orderedEpisodes:!!local.orderedEpisodes};
}
const MAX_WATCH_ORIGIN='https://play.max.com';
const SERVICE_AVAILABILITY={
  netflix:{ids:[8],names:['netflix']},
  max:{ids:[384,1899],names:['max','hbo max','hbo']},
  hulu:{ids:[15],names:['hulu']},
  disney:{ids:[337],names:['disney','disney+']},
  prime:{ids:[9,119],names:['prime','amazon','prime video']},
  tubi:{ids:[531],names:['tubi']},
  peacock:{ids:[387],names:['peacock']},
  paramount:{ids:[1855],names:['paramount']},
  appletv:{ids:[2,386],names:['apple','apple tv']},
  crunchyroll:{ids:[583],names:['crunchyroll']},
  pluto:{ids:[257],names:['pluto']},
};

function smartShuffleEpKey(seasonNum,epNum){return `s${seasonNum}e${epNum}`;}
function serializePlayedByShow(playedByShow){
  const out={};
  Object.keys(playedByShow).forEach(showId=>{out[showId]=[...playedByShow[showId]];});
  return out;
}
function smartShuffle(enrichedShows,playedByShow,lastPlayedShow,allowedMaxIds=null,options={}){
  const roundPlayedShows=options.roundPlayedShows instanceof Set
    ?options.roundPlayedShows
    :deserializeRoundPlayedShows(options.roundPlayedShows);
  const orderedEpisodes=!!options.orderedEpisodes;
  const nextEpisodeIndexByShow={...(options.nextEpisodeIndexByShow||{})};

  let availableShows=enrichedShows.filter(show=>show.onService!==false&&show.episodes?.length);
  if(allowedMaxIds?.size){
    availableShows=availableShows.filter(show=>allowedMaxIds.has(String(show.id).toLowerCase()));
  }
  if(!availableShows.length)return null;

  let roundShows=availableShows.filter(show=>!roundPlayedShows.has(String(show.id)));
  if(!roundShows.length){
    roundPlayedShows.clear();
    roundShows=availableShows;
  }

  let showPool=roundShows;
  if(lastPlayedShow&&showPool.length>1){
    const withoutLast=showPool.filter(show=>String(show.id)!==String(lastPlayedShow));
    if(withoutLast.length)showPool=withoutLast;
  }

  if(orderedEpisodes){
    const show=showPool[Math.floor(Math.random()*showPool.length)];
    const showId=String(show.id);
    const idx=nextEpisodeIndexByShow[showId]||0;
    const episode=show.episodes[idx%show.episodes.length];
    if(!episode)return null;
    const pick={...episode,showId:show.id};
    nextEpisodeIndexByShow[showId]=(idx+1)%show.episodes.length;
    if(!playedByShow[showId])playedByShow[showId]=new Set();
    playedByShow[showId].add(pick.id);
    roundPlayedShows.add(showId);
    return {pick,lastPlayedShow:showId,roundPlayedShows,nextEpisodeIndexByShow};
  }

  let candidates=[];
  for(const show of showPool){
    const showId=String(show.id);
    if(!playedByShow[showId])playedByShow[showId]=new Set();
    let unplayed=show.episodes.filter(ep=>!playedByShow[showId].has(ep.id));
    if(!unplayed.length){
      playedByShow[showId].clear();
      unplayed=show.episodes;
    }
    candidates=candidates.concat(unplayed.map(ep=>({...ep,showId:show.id})));
  }
  if(!candidates.length){
    candidates=availableShows.flatMap(show=>show.episodes.map(ep=>({...ep,showId:show.id})));
  }
  if(!candidates.length)return null;
  const pick=candidates[Math.floor(Math.random()*candidates.length)];
  const pickShowId=String(pick.showId);
  if(!playedByShow[pickShowId])playedByShow[pickShowId]=new Set();
  playedByShow[pickShowId].add(pick.id);
  roundPlayedShows.add(pickShowId);
  return {pick,lastPlayedShow:pickShowId,roundPlayedShows,nextEpisodeIndexByShow};
}
async function showAvailableOnService(showId,type,selectedService){
  const svc=SERVICE_AVAILABILITY[selectedService];
  if(!svc)return true;
  try{
    const pd=await fetchProviders(showId,type);
    if(!pd)return true;
    const all=[...(pd.free||[]),...(pd.flatrate||[]),...(pd.sub||[]),...(pd.rent||[])];
    return all.some(p=>svc.ids.includes(p.provider_id)||svc.names.some(n=>(p.provider_name||'').toLowerCase().includes(n)));
  }catch(e){return true;}
}
async function readMaxEpisodeCacheFromStorage(showName,tmdbId){
  return new Promise(resolve=>{
    const requestId=Math.random().toString(36).slice(2);
    const timer=setTimeout(()=>{cleanup();resolve([]);},5000);
    function handler(e){
      if(e.source!==window||e.data?.type!=='SHUFFLR_EPISODE_CACHE'||e.data.requestId!==requestId)return;
      cleanup();
      resolve(e.data.episodeDetails||[]);
    }
    function cleanup(){
      clearTimeout(timer);
      window.removeEventListener('message',handler);
    }
    window.addEventListener('message',handler);
    window.postMessage({type:'SHUFFLR_READ_EPISODE_CACHE',source:'shufflr-web',requestId,showName,tmdbId},'*');
  });
}
function mergeMaxEpisodeMetadata(episodes,maxEpisodes){
  if(!maxEpisodes?.length)return episodes;
  const map={};
  maxEpisodes.forEach(ep=>{
    map[smartShuffleEpKey(ep.seasonNum,ep.episode_number)]=ep;
  });
  return episodes.map(ep=>{
    const max=map[ep.id];
    if(!max)return ep;
    return {
      ...ep,
      alternateId:max.alternateId,
      watchUrl:max.watchUrl||(`${MAX_WATCH_ORIGIN}/video/watch/${max.alternateId}`),
    };
  });
}
async function fetchShowEpisodes(showId,showMeta,manualEps,selectedService){
  if(showMeta.release_date){
    return [{
      id:`movie-${showId}`,
      showId,
      showName:showMeta.name||showMeta.title||'',
      isMovie:true,
      name:showMeta.name||showMeta.title||'',
    }];
  }
  const r=await fetch(`https://api.themoviedb.org/3/tv/${showId}?api_key=${KEY}`);
  const d=await r.json();
  const seasons=(d.seasons||[]).filter(s=>s.season_number>0&&s.episode_count>0);
  const episodes=[];
  await Promise.all(seasons.map(async s=>{
    try{
      const sr=await fetch(`https://api.themoviedb.org/3/tv/${showId}/season/${s.season_number}?api_key=${KEY}`);
      const sd=await sr.json();
      (sd.episodes||[]).forEach(ep=>{
        episodes.push({
          id:smartShuffleEpKey(s.season_number,ep.episode_number),
          showId,
          showName:d.name||showMeta.name||'',
          seasonNum:s.season_number,
          episode_number:ep.episode_number,
          name:ep.name||'',
          runtime:ep.runtime||0,
          vote_average:ep.vote_average||0,
        });
      });
    }catch(e){}
  }));
  (manualEps||[]).forEach(ep=>{
    const id=smartShuffleEpKey(ep.seasonNum,ep.episode_number);
    if(!episodes.some(e=>e.id===id)){
      episodes.push({
        id,
        showId:ep.showId,
        showName:ep.showName||d.name||'',
        seasonNum:ep.seasonNum,
        episode_number:ep.episode_number,
        name:ep.name||'',
        runtime:ep.runtime||0,
        manuallyAdded:true,
        alternateId:ep.alternateId||null,
        watchUrl:ep.watchUrl||null,
      });
    }
  });
  if(selectedService==='max'){
    const maxEps=await readMaxEpisodeCacheFromStorage(showMeta.name||showMeta.title||d.name||'',showId);
    return mergeMaxEpisodeMetadata(episodes,maxEps);
  }
  return episodes;
}
async function buildEnrichedPlaylist(playlist,selectedService){
  const shows=playlist.shows||[];
  const manualEps=playlist.episodes||[];
  const enriched=[];
  const seenShowIds=new Set();
  await Promise.all(shows.map(async show=>{
    const eps=await fetchShowEpisodes(show.id,show,manualEps.filter(e=>e.showId===show.id),selectedService);
    enriched.push({
      id:show.id,
      name:show.name||show.title||'',
      type:show.release_date?'movie':'tv',
      episodes:eps,
    });
    seenShowIds.add(show.id);
  }));
  const orphanByShow={};
  manualEps.filter(e=>!seenShowIds.has(e.showId)).forEach(ep=>{
    if(!orphanByShow[ep.showId])orphanByShow[ep.showId]=[];
    orphanByShow[ep.showId].push({
      id:smartShuffleEpKey(ep.seasonNum,ep.episode_number),
      showId:ep.showId,
      showName:ep.showName||'',
      seasonNum:ep.seasonNum,
      episode_number:ep.episode_number,
      name:ep.name||'',
      runtime:ep.runtime||0,
      manuallyAdded:true,
    });
  });
  Object.keys(orphanByShow).forEach(showId=>{
    const episodes=orphanByShow[showId];
    enriched.push({id:Number(showId),name:episodes[0].showName,type:'tv',episodes});
  });
  return enriched;
}
async function filterPlaylistByService(enriched,selectedService){
  const checked=await Promise.all(enriched.map(async show=>{
    const onService=await showAvailableOnService(show.id,show.type==='movie'?'movie':'tv',selectedService);
    return {...show,onService};
  }));
  return checked.filter(show=>show.onService);
}
function buildSmartShuffleEpisodeUrl(pick,selectedService){
  if(pick.watchUrl)return pick.watchUrl;
  if(pick.alternateId&&selectedService==='max'){
    return `${MAX_WATCH_ORIGIN}/video/watch/${pick.alternateId}`;
  }
  const svc=STREAMING_SERVICES.find(s=>s.id===selectedService);
  const showName=pick.showName||'';
  if(pick.isMovie)return svc?svc.url+encodeURIComponent(showName):getEpLink();
  const query=`${showName} S${String(pick.seasonNum).padStart(2,'0')}E${String(pick.episode_number).padStart(2,'0')}`;
  return svc?svc.url+encodeURIComponent(query):getEpLink();
}
function buildActivePlaylistHandoff(playlist,enriched,selectedService,pick,playedByShow,lastPlayedShow,playlistIndex,extraState={}){
  return {
    armed:true,
    playlist:enriched.map(s=>({id:s.id,name:s.name,type:s.type,episodes:s.episodes})),
    playlistName:playlist.name||'',
    playlistIndex,
    shows:[...(playlist.shows||[])],
    episodes:[...(playlist.episodes||[])],
    selectedService,
    currentEpisode:{
      showId:pick.showId,
      showName:pick.showName,
      seasonNum:pick.seasonNum,
      episode_number:pick.episode_number,
      name:pick.name,
      isMovie:!!pick.isMovie,
      id:pick.id,
      alternateId:pick.alternateId||null,
    },
    currentEpisodeUrl:buildSmartShuffleEpisodeUrl(pick,selectedService),
    playedByShow:serializePlayedByShow(playedByShow),
    lastPlayedShow,
    roundPlayedShows:serializeRoundPlayedShows(extraState.roundPlayedShows),
    nextEpisodeIndexByShow:{...(extraState.nextEpisodeIndexByShow||{})},
    sessionStartedAt:Date.now(),
  };
}
function handoffActivePlaylistToExtension(payload){
  return new Promise(resolve=>{
    const storagePayload={[SHUFFLR_ACTIVE_PLAYLIST_KEY]:payload};
    if(payload.playedByShow){
      storagePayload[SHUFFLR_EPISODE_STATE_KEY]={
        playedByShow:payload.playedByShow,
        lastPlayedShow:payload.lastPlayedShow||null,
        roundPlayedShows:payload.roundPlayedShows||[],
        nextEpisodeIndexByShow:payload.nextEpisodeIndexByShow||{},
        playlistName:payload.playlistName||'',
        playlistIndex:payload.playlistIndex??0,
      };
    }
    const finish=()=>{
      localStorage.setItem(SHUFFLR_ACTIVE_PLAYLIST_KEY,JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('shufflr-handoff',{detail:payload}));
      window.postMessage({type:'SHUFFLR_HANDOFF',source:'shufflr-web',payload},'*');
      resolve();
    };
    try{
      if(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.local){
        chrome.storage.local.set(storagePayload,finish);
        return;
      }
    }catch(e){}
    finish();
  });
}
async function playPlaylist(pi){
  const p=playlists[pi];
  if(!(p.shows||[]).length&&!(p.episodes||[]).length){showToast('NOTHING IN PLAYLIST');return;}
  const selectedService=localStorage.getItem('shufflr_service')||'netflix';
  showToast('SMART SHUFFLE...');
  const playedByShow={};
  const lastPlayedShow=null;
  const roundPlayedShows=new Set();
  const nextEpisodeIndexByShow={};
  const settings=await readShuffleSettings();
  try{
    let enriched=await buildEnrichedPlaylist(p,selectedService);
    enriched=await filterPlaylistByService(enriched,selectedService);
    if(!enriched.length)return;
    const result=smartShuffle(enriched,playedByShow,lastPlayedShow,null,{
      roundPlayedShows,
      orderedEpisodes:settings.orderedEpisodes,
      nextEpisodeIndexByShow,
    });
    if(!result){showToast('NO EPISODES FOUND');return;}
    const {pick,lastPlayedShow:newLast,roundPlayedShows:newRound,nextEpisodeIndexByShow:newIndexes}=result;
    const handoff=buildActivePlaylistHandoff(p,enriched,selectedService,pick,playedByShow,newLast,pi,{
      roundPlayedShows:newRound,
      nextEpisodeIndexByShow:newIndexes,
    });
    await handoffActivePlaylistToExtension(handoff);
    if(!pick.isMovie){
      markWatched(`${pick.showId}-s${pick.seasonNum}e${pick.episode_number}`,pick.showName,pick.name,pick.seasonNum,pick.episode_number,'');
      highlightedEps=[{...pick,seasonNum:pick.seasonNum,episode_number:pick.episode_number}];
      _timerEp={
        name:pick.name||'Episode',
        code:`S${String(pick.seasonNum).padStart(2,'0')} E${String(pick.episode_number).padStart(2,'0')}`,
        runtime:pick.runtime||45,
      };
      _timerNextEp=null;
      startTimerPhase1(60);
    }
    const label=(pick.name||pick.showName||'').toUpperCase().slice(0,18);
    showToast('PLAYING: '+label);
    window.open(handoff.currentEpisodeUrl,'_blank');
  }catch(e){
    console.error('[Shufflr] playPlaylist',e);
    showToast('PLAY FAILED');
  }
}

async function shufflePlaylist(pi){
  const p=playlists[pi];
  const shows=p.shows||[];
  const episodes=p.episodes||[];
  if(!shows.length&&!episodes.length){showToast('NOTHING IN PLAYLIST');return;}
  // Decide randomly between picking a show or a specific episode
  const allItems=[...shows.map(s=>({type:'show',data:s})),...episodes.map(e=>({type:'episode',data:e}))];
  const picked=allItems[Math.floor(Math.random()*allItems.length)];
  // If it's a manually added episode, always play it regardless of blocked seasons
  if(picked.type==='episode'){
    const ep=picked.data;
    showToast('EPISODE: '+(ep.name||'').toUpperCase().slice(0,14)+'...');
    // Navigate to the show and highlight this episode
    const r=await fetch(`https://api.themoviedb.org/3/tv/${ep.showId}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';currentShow=show;currentNav='shows';
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};
    // Pre-load the season so the episode is available
    const sr=await fetch(`https://api.themoviedb.org/3/tv/${ep.showId}/season/${ep.seasonNum}?api_key=${KEY}`);
    const sd=await sr.json();
    allEpisodes[ep.seasonNum]=sd.episodes||[];
    const fullEp=allEpisodes[ep.seasonNum].find(e=>e.episode_number===ep.episode_number);
    highlightedEps=fullEp?[{...fullEp,seasonNum:ep.seasonNum}]:[];
    document.getElementById('search-input').value=show.name||'';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await loadSeasons(show.id);
    return;
  }
  const show=picked.data;
  showToast('SHUFFLING '+((show.name||show.title||'').toUpperCase()).slice(0,15)+'...');
  const type=show.release_date?'movie':'tv';
  if(type==='movie'){
    currentType='movie';currentShow=show;
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    renderMovieMain(show);
  } else {
    currentType='tv';currentShow=show;
    currentNav='shows';
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    document.getElementById('search-input').value=show.name||'';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await loadSeasons(show.id);
    renderMain(true);
  }
}

async function openYourShowDetailPage(pi,si){
  const show=playlists[pi]?.shows?.[si];
  if(!show)return;
  const hasTmdbId=show?.id!=null&&/^\d+$/.test(String(show.id));

  if(hasTmdbId){
    await _loadShow(show);
    return;
  }

  const query=stripServiceSuffixFromShowName(getShowLabel(show));
  if(!query){
    showToast('NO SHOW NAME');
    return;
  }
  showToast('LOADING '+query.toUpperCase().slice(0,15)+'...');
  try{
    const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${KEY}&query=${encodeURIComponent(query)}`);
    const d=await r.json();
    const match=(d.results||[])[0];
    if(!match){
      showToast('NO TMDB MATCH');
      return;
    }
    currentNav='shows';
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    await _loadShow(match);
  }catch(e){
    console.error(e);
    showToast('SEARCH FAILED');
  }
}

// PLAYLIST MODAL
function getShowMaxId(show){
  return show?.maxId||show?.maxShowId||show?.max_id||null;
}
function getShowLabel(show){
  return (show?.title||show?.name||show?.original_name||'').trim();
}
function normalizePlShowName(name){
  return String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function showsMatchForMaxIdLookup(targetShow,entry){
  if(!getShowMaxId(entry))return false;
  if(targetShow?.id!=null&&entry?.id!=null&&String(targetShow.id)===String(entry.id))return true;
  const targetName=normalizePlShowName(targetShow?.name||targetShow?.title);
  const entryName=normalizePlShowName(getShowLabel(entry));
  return !!(targetName&&entryName&&targetName===entryName);
}
function isShowInPlaylist(playlist,show){
  return (playlist?.shows||[]).some(s=>{
    if(show?.id!=null&&s?.id!=null&&s.id===show.id)return true;
    const maxId=getShowMaxId(s);
    if(maxId&&show?.maxId&&String(maxId)===String(show.maxId))return true;
    const nameA=normalizePlShowName(show?.name||show?.title);
    const nameB=normalizePlShowName(getShowLabel(s));
    return !!(nameA&&nameB&&nameA===nameB);
  });
}
function escapeHtml(text){
  return String(text||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function findMaxIdEntryForShow(allPlaylists,targetShow){
  if(!Array.isArray(allPlaylists)||!targetShow)return null;
  for(const playlist of allPlaylists){
    for(const show of (playlist?.shows||[])){
      if(!showsMatchForMaxIdLookup(targetShow,show))continue;
      const maxId=getShowMaxId(show);
      if(!maxId)continue;
      return {
        title:getShowLabel(show)||getShowLabel(targetShow)||'Show',
        maxId:String(maxId),
      };
    }
  }
  return null;
}
async function resolveMaxIdEntryForShow(targetShow){
  const storedPlaylists=await readPlaylistsFromChromeStorage();
  return findMaxIdEntryForShow(storedPlaylists||playlists,targetShow);
}
function dismissPlaylistMaxNotice(){
  const el=document.getElementById('playlist-max-notice');
  if(el)el.hidden=true;
}
function showPlaylistMaxNotice(showName){
  const el=document.getElementById('playlist-max-notice');
  if(!el)return;
  const label=escapeHtml(showName||'this show');
  el.innerHTML=`<div class="playlist-max-notice-body">
    <p>To add <strong>${label}</strong> to a playlist, visit its page on Max and click <strong>▾ → +</strong> in the Shufflr button. Once added once, you can add it to any playlist here.</p>
    <button type="button" class="playlist-max-notice-dismiss" onclick="dismissPlaylistMaxNotice()" aria-label="Dismiss">✕</button>
  </div>`;
  el.hidden=false;
}
function readPlaylistsFromChromeStorage(){
  return new Promise(resolve=>{
    try{
      if(typeof chrome==='undefined'||!chrome.storage?.local){
        resolve(null);
        return;
      }
      chrome.storage.local.get(SHUFFLR_PLAYLISTS_KEY,result=>{
        const stored=result?.[SHUFFLR_PLAYLISTS_KEY];
        resolve(Array.isArray(stored)?stored:null);
      });
    }catch(e){
      resolve(null);
    }
  });
}
function openPlaylistModal(ep){
  _pendingEp = ep || null;
  dismissPlaylistMaxNotice();
  renderPlaylistModal();
  document.getElementById('playlist-modal').classList.add('open');
}
function closePlaylistModal(){
  dismissPlaylistMaxNotice();
  document.getElementById('playlist-modal').classList.remove('open');
}
function renderPlaylistModal(){
  // Update modal subtitle to reflect what we're adding
  const sub=document.querySelector('.playlist-card-sub');
  if(sub){
    if(_pendingEp){
      const code=`S${String(_pendingEp.season_number||_pendingEp.seasonNum||'').padStart(2,'0')} E${String(_pendingEp.episode_number||'').padStart(2,'0')}`;
      sub.textContent=`Adding episode: ${code} — ${_pendingEp.name||''}`;
    } else {
      sub.textContent='Choose a playlist or create a new one.';
    }
  }
  document.getElementById('playlist-modal-list').innerHTML=playlists.length
    ?playlists.map((p,i)=>{
      // Check already-added differently for episodes vs shows
      let has=false;
      if(_pendingEp){
        has=(p.episodes||[]).some(e=>e.showId===currentShow?.id&&e.episode_number===_pendingEp.episode_number&&e.seasonNum===(_pendingEp.seasonNum||_pendingEp.season_number));
      } else {
        has=isShowInPlaylist(p,currentShow);
      }
      const count=(p.shows||[]).length+(p.episodes||[]).length;
      return `<div class="playlist-modal-row" onclick="addToPlaylist(${i})">
        <div><div class="playlist-modal-row-name">${p.name}</div><div class="playlist-modal-row-count">${count} item${count!==1?'s':''}</div></div>
        ${has?'<span style="color:var(--blue);font-size:0.75rem;font-weight:700;">Added</span>':''}
      </div>`;}).join('')
    :'<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;">No playlists yet. Create one below.</div>';
}
async function addToPlaylist(i){
  if(!currentShow)return;
  if(_pendingEp){
    // Add individual episode — manuallyAdded:true so blocked seasons don't filter it
    if(!playlists[i].episodes) playlists[i].episodes=[];
    const epEntry={
      showId:currentShow.id,
      showName:currentShow.name||currentShow.title||'',
      showPoster:currentShow.poster_path||'',
      episode_number:_pendingEp.episode_number,
      seasonNum:_pendingEp.seasonNum||_pendingEp.season_number,
      name:_pendingEp.name||'',
      overview:_pendingEp.overview||'',
      vote_average:_pendingEp.vote_average||0,
      runtime:_pendingEp.runtime||0,
      manuallyAdded:true,
    };
    const already=playlists[i].episodes.some(e=>e.showId===epEntry.showId&&e.episode_number===epEntry.episode_number&&e.seasonNum===epEntry.seasonNum);
    if(!already) playlists[i].episodes.push(epEntry);
    savePlaylists();
    renderPlaylistModal();
    showToast('EPISODE ADDED TO '+playlists[i].name.toUpperCase().slice(0,10));
    return;
  }

  if(!playlists[i].shows) playlists[i].shows=[];
  if(isShowInPlaylist(playlists[i],currentShow)){
    renderPlaylistModal();
    showToast('Already in '+playlists[i].name);
    return;
  }

  const maxIdEntry=await resolveMaxIdEntryForShow(currentShow);

  if(maxIdEntry){
    dismissPlaylistMaxNotice();
    playlists[i].shows.push({title:maxIdEntry.title,maxId:maxIdEntry.maxId});
    savePlaylists();
    renderPlaylistModal();
    showToast('Added '+maxIdEntry.title+' to '+playlists[i].name);
    if(currentType==='tv')renderMain();
    else renderMovieMain(currentShow);
    return;
  }

  showPlaylistMaxNotice(getShowLabel(currentShow)||'this show');
}
async function createPlaylist(){
  const input=document.getElementById('new-playlist-input');
  const name=input.value.trim();
  if(!name)return;
  const newP={
    name,
    shows:[],
    episodes:[],
    // Tag playlist with service — hardcoded to 'max' until multi-service support is added.
    service: 'max',
  };
  if(_pendingEp&&currentShow){
    newP.episodes.push({
      showId:currentShow.id,
      showName:currentShow.name||currentShow.title||'',
      showPoster:currentShow.poster_path||'',
      episode_number:_pendingEp.episode_number,
      seasonNum:_pendingEp.seasonNum||_pendingEp.season_number,
      name:_pendingEp.name||'',
      overview:_pendingEp.overview||'',
      vote_average:_pendingEp.vote_average||0,
      runtime:_pendingEp.runtime||0,
      manuallyAdded:true,
    });
  } else if(currentShow){
    const maxIdEntry=await resolveMaxIdEntryForShow(currentShow);
    if(!maxIdEntry){
      showPlaylistMaxNotice(getShowLabel(currentShow)||'this show');
      return;
    }
    dismissPlaylistMaxNotice();
    newP.shows.push({title:maxIdEntry.title,maxId:maxIdEntry.maxId});
  }
  playlists.push(newP);
  savePlaylists();
  input.value='';
  renderPlaylistModal();
  showToast('PLAYLIST CREATED');
  if(currentShow&&!_pendingEp){if(currentType==='tv')renderMain();else renderMovieMain(currentShow);}
}

// UTILS
function ensurePlaylistNameModal() {
  if (document.getElementById('shufflr-pl-name-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'shufflr-pl-name-modal';
  modal.className = 'shufflr-pl-name-modal';
  modal.innerHTML = `
    <div class="shufflr-pl-name-modal-box" role="dialog" aria-modal="true" aria-labelledby="shufflr-pl-name-title">
      <div class="shufflr-pl-name-modal-title" id="shufflr-pl-name-title">NEW PLAYLIST</div>
      <label class="shufflr-pl-name-modal-label" id="shufflr-pl-name-label" for="shufflr-pl-name-input">Playlist name:</label>
      <input type="text" class="shufflr-pl-name-modal-input" id="shufflr-pl-name-input" autocomplete="off" />
      <div class="shufflr-pl-name-modal-actions">
        <button type="button" class="shufflr-pl-name-modal-btn shufflr-pl-name-modal-btn-cancel" id="shufflr-pl-name-cancel">Cancel</button>
        <button type="button" class="shufflr-pl-name-modal-btn shufflr-pl-name-modal-btn-confirm" id="shufflr-pl-name-confirm">Confirm</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function promptPlaylistName(message = 'Playlist name:') {
  ensurePlaylistNameModal();
  const modal = document.getElementById('shufflr-pl-name-modal');
  const input = document.getElementById('shufflr-pl-name-input');
  const confirmBtn = document.getElementById('shufflr-pl-name-confirm');
  const cancelBtn = document.getElementById('shufflr-pl-name-cancel');
  const label = document.getElementById('shufflr-pl-name-label');

  return new Promise((resolve) => {
    label.textContent = message;
    input.value = '';
    modal.classList.add('open');
    setTimeout(() => input.focus(), 0);

    const finish = (value) => {
      modal.classList.remove('open');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      input.onkeydown = null;
      resolve(value);
    };

    confirmBtn.onclick = () => finish(input.value);
    cancelBtn.onclick = () => finish(null);
    modal.onclick = (e) => {
      if (e.target === modal) finish(null);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(input.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(null);
      }
    };
  });
}

function showMain(html){document.getElementById('main-content').innerHTML=html;}

// ---- WHERE TO WATCH ----
const STREAMING_SERVICES = [
  {id:'tubi',    name:'Tubi',         free:true,  color:'#fa5252', url:'https://tubitv.com/search/'},
  {id:'pluto',   name:'Pluto TV',     free:true,  color:'#a855f7', url:'https://pluto.tv/search#'},
  {id:'peacock', name:'Peacock',      free:true,  color:'#1d4ed8', url:'https://www.peacocktv.com/search?q='},
  {id:'plex',    name:'Plex',         free:true,  color:'#e5a00d', url:'https://watch.plex.tv/search?q='},
  {id:'netflix', name:'Netflix',      free:false, color:'#e50914', url:'https://www.netflix.com/search?q='},
  {id:'hulu',    name:'Hulu',         free:false, color:'#1ce783', url:'https://www.hulu.com/search?q='},
  {id:'disney',  name:'Disney+',      free:false, color:'#113ccf', url:'https://www.disneyplus.com/search/'},
  {id:'max',     name:'Max',          free:false, color:'#002be0', url:'https://play.max.com/search?q='},
  {id:'prime',   name:'Prime Video',  free:false, color:'#00a8e1', url:'https://www.amazon.com/s?k='},
  {id:'apple',   name:'Apple TV+',    free:false, color:'#555555', url:'https://tv.apple.com/search?term='},
  {id:'paramount',name:'Paramount+',  free:false, color:'#0064ff', url:'https://www.paramountplus.com/search/'},
  {id:'crunchyroll',name:'Crunchyroll',free:false,color:'#f47521', url:'https://www.crunchyroll.com/search?q='},
];



// ---- FREE TAB ----
let freeFilter = 'all';

const FREE_SHOWS = [
  {id:1396,  name:'Breaking Bad',          poster:'/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', rating:9.5, services:[{name:'Tubi',url:'https://tubitv.com/series/500062/breaking-bad',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=breaking+bad',free:false}], type:'tv',    genre:'Drama',   overview:"A high school chemistry teacher turned methamphetamine manufacturer partners with a former student to secure his family's future after a cancer diagnosis."},
  {id:1668,  name:'Friends',               poster:'/f496cm9enuEsZkSPzCwnTESEK5s.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/series/305920/friends',free:true},{name:'Max',url:'https://play.max.com/search?query=friends',free:false}], type:'tv',    genre:'Comedy',  overview:"Six friends navigate love, careers, and life in New York City, sharing laughs and heartaches from their favorite coffee house hangout."},
  {id:2316,  name:'The Office',            poster:'/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg', rating:8.6, services:[{name:'Tubi',url:'https://tubitv.com/series/300829/the-office',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+office',free:false}], type:'tv',    genre:'Comedy',  overview:"A mockumentary-style look at the everyday lives of office employees at the Scranton, Pennsylvania branch of the Dunder Mifflin Paper Company."},
  {id:63174, name:'Lucifer',               poster:'/4EYPN5mVIhKLfxGruy7Dy41dTVn.jpg', rating:8.1, services:[{name:'Tubi',url:'https://tubitv.com/series/500001/lucifer',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=lucifer',free:false}], type:'tv',    genre:'Drama',   overview:"Lucifer Morningstar, bored of being the ruler of Hell, abandons his kingdom and becomes a consultant for the LAPD in Los Angeles."},
  {id:1402,  name:'The Walking Dead',      poster:'/xf9wuDcqlUPWABZNeDKPbZkvSx4.jpg', rating:8.1, services:[{name:'Tubi',url:'https://tubitv.com/series/500034/the-walking-dead',free:true},{name:'AMC+',url:'https://www.amcplus.com/shows/the-walking-dead',free:false}], type:'tv',    genre:'Horror',  overview:"Sheriff deputy Rick Grimes leads a group of survivors in a post-apocalyptic world overrun by zombies, fighting both the undead and other desperate survivors."},
  {id:37854, name:'One Piece',             poster:'/cMD9Ygz11zjJzAovURpO75Qg7rT.jpg', rating:8.7, services:[{name:'Tubi',url:'https://tubitv.com/search/one-piece',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=one+piece',free:false}], type:'tv',    genre:'Anime',   overview:"Monkey D. Luffy and his pirate crew sail the Grand Line in search of the legendary treasure known as the One Piece, to become King of the Pirates."},
  {id:46260, name:'Attack on Titan',       poster:'/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg', rating:9.0, services:[{name:'Tubi',url:'https://tubitv.com/search/attack-on-titan',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=attack+on+titan',free:false},{name:'Hulu',url:'https://www.hulu.com/search?q=attack+on+titan',free:false}], type:'tv',    genre:'Anime',   overview:"In a world where humanity lives inside cities surrounded by enormous walls, soldiers fight giant humanoid Titans that devour humans seemingly without reason."},
  {id:60625, name:'Rick and Morty',        poster:'/gdIrmf2DdY5mgN6ycVP0XlzKzbE.jpg', rating:9.2, services:[{name:'Tubi',url:'https://tubitv.com/series/500067/rick-and-morty',free:true},{name:'Max',url:'https://play.max.com/search?query=rick+and+morty',free:false}], type:'tv',    genre:'Comedy',  overview:"An alcoholic scientist drags his good-natured grandson on dangerous and outrageous adventures across the universe and alternate dimensions."},
  {id:2190,  name:'South Park',            poster:'/9Yn6SHf3fkOGWMoGOJU31pBqTOC.jpg', rating:8.3, services:[{name:'Tubi',url:'https://tubitv.com/search/south-park',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'tv',    genre:'Comedy',  overview:"Four foul-mouthed fourth graders tackle controversial topics with sharp satire in the quiet mountain town of South Park, Colorado."},
  {id:1421,  name:'Modern Family',         poster:'/fGi9c9TTBeCBkd6wTZHFoOhVOqB.jpg', rating:7.9, services:[{name:'Tubi',url:'https://tubitv.com/search/modern-family',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=modern+family',free:false}], type:'tv',    genre:'Comedy',  overview:"Three families — a nuclear family, a gay couple with an adopted daughter, and an older man with a young trophy wife — navigate the hilarious challenges of modern parenthood."},
  {id:4607,  name:'Lost',                  poster:'/og6S0aTZU6YUJAbqxeKjCa3kY1E.jpg', rating:8.0, services:[{name:'Tubi',url:'https://tubitv.com/search/lost',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=lost',free:false}], type:'tv',    genre:'Drama',   overview:"Survivors of a plane crash are stranded on a mysterious tropical island filled with strange phenomena, secrets, and danger lurking at every turn."},
  {id:1622,  name:'Suits',                 poster:'/vS5GBSHuKRFa4vBqB6dWgIgCmIG.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/suits',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=suits',free:false},{name:'Netflix',url:'https://www.netflix.com/search?q=suits',free:false}], type:'tv',    genre:'Drama',   overview:"A talented college dropout begins working as a law associate under a top attorney in New York City, despite never having attended law school."},
  {id:1100,  name:'How I Met Your Mother', poster:'/b34jPzmB0wZy7EjUZoleXOl2RRI.jpg', rating:8.3, services:[{name:'Tubi',url:'https://tubitv.com/search/how-i-met-your-mother',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=how+i+met+your+mother',free:false}], type:'tv',    genre:'Comedy',  overview:"A father recounts to his children the long, winding story of how he met their mother and the misadventures he shared with his four best friends in New York City."},
  {id:2993,  name:'Family Guy',            poster:'/q2GXGEpXVFfSE0KSmXTnkJVmkfx.jpg', rating:8.2, services:[{name:'Tubi',url:'https://tubitv.com/search/family-guy',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=family+guy',free:false}], type:'tv',    genre:'Comedy',  overview:"The dysfunctional Griffin family navigates life in Quahog, Rhode Island — featuring a talking dog, a diabolical baby, and endless cutaway gags."},
  {id:615,   name:'Futurama',              poster:'/7MOxu3bDajFvLmExonYTWkNOiRZ.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/futurama',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=futurama',free:false}], type:'tv',    genre:'Comedy',  overview:"A pizza delivery boy is accidentally cryogenically frozen and wakes up 1000 years in the future, finding work at an interplanetary delivery company."},
  {id:60059, name:'The Americans',         poster:'/gej4wdB2F8yjDeKyD0T7cOF9ixS.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-americans',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=the+americans',free:false}], type:'tv',    genre:'Drama',   overview:"Two KGB agents posing as an ordinary American couple in suburban Washington D.C. during the Cold War balance their dangerous secret lives with raising a family."},
  {id:550,   name:'Fight Club',            poster:'/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/fight-club',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=fight+club',free:false}], type:'movie', genre:'Drama',   overview:"An insomniac office worker forms an underground fight club with a soap salesman, which spirals into something far more dangerous and anarchic."},
  {id:497,   name:'The Green Mile',        poster:'/velWPhVMQeQKcxggNEU8YmIo52R.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-green-mile',free:true},{name:'Max',url:'https://play.max.com/search?query=the+green+mile',free:false}], type:'movie', genre:'Drama',   overview:"A death row corrections officer at Cold Mountain Penitentiary discovers one of his prisoners has a miraculous, supernatural gift."},
  {id:539,   name:'Psycho',                poster:'/81d8oyEFgj7FlxJqSDXWr8JH8kV.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/movies/660351/psycho',free:true}], type:'movie', genre:'Horror',  overview:"A secretary on the run embeds herself at a remote motel run by a mysterious young man dominated by his reclusive mother in Alfred Hitchcock's masterpiece of suspense."},
  {id:694,   name:'The Shining',           poster:'/b6ko0IKC8MdYBBPkkA1aBPLe2yz.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/the-shining',free:true},{name:'Max',url:'https://play.max.com/search?query=the+shining',free:false}], type:'movie', genre:'Horror',  overview:"A family heads to an isolated hotel for the winter, where a sinister presence influences the father into violence, as his psychic son sees horrifying visions."},
  {id:238,   name:'The Godfather',         poster:'/3bhkrj58Vtu7enYsLagi1dPcDWR.jpg', rating:8.7, services:[{name:'Tubi',url:'https://tubitv.com/search/the-godfather',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Crime',   overview:"The aging patriarch of an organized crime dynasty transfers control to his reluctant youngest son, who becomes a ruthless and powerful leader."},
  {id:769,   name:'GoodFellas',            poster:'/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/goodfellas',free:true},{name:'Max',url:'https://play.max.com/search?query=goodfellas',free:false}], type:'movie', genre:'Crime',   overview:"The true story of Henry Hill, a street-smart kid who rises through the ranks of the New York mob under the wing of a local gangster."},
  {id:155,   name:'The Dark Knight',       poster:'/qJ2tW6WMUDux911r6m7haRef0WH.jpg', rating:8.5, services:[{name:'Tubi',url:'https://tubitv.com/search/the-dark-knight',free:true},{name:'Max',url:'https://play.max.com/search?query=the+dark+knight',free:false}], type:'movie', genre:'Action',  overview:"Batman faces the Joker, a criminal mastermind who plunges Gotham City into anarchy, forcing the Dark Knight to question everything he stands for."},
  {id:157336,name:'Interstellar',          poster:'/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', rating:8.4, services:[{name:'Tubi',url:'https://tubitv.com/search/interstellar',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Sci-Fi',  overview:"A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival as Earth becomes uninhabitable."},
  {id:457,   name:'Titanic',               poster:'/9xjZS2rlVxm3rAPFEQ2SJF7J4ll.jpg', rating:7.9, services:[{name:'Tubi',url:'https://tubitv.com/movies/457982/titanic',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Romance', overview:"A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the ill-fated RMS Titanic on its doomed maiden voyage."},
  {id:1399,  name:'Game of Thrones',       poster:'/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', rating:9.3, services:[{name:'Pluto TV',url:'https://pluto.tv/us/on-demand/series/game-of-thrones',free:true},{name:'Max',url:'https://play.max.com/search?query=game+of+thrones',free:false}], type:'tv',    genre:'Fantasy', overview:"Nine noble families fight for control of the mythical lands of Westeros, while an ancient enemy returns after millennia in the frozen north."},
  {id:66732, name:'Stranger Things',       poster:'/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', rating:8.7, services:[{name:'Pluto TV',url:'https://pluto.tv/search#stranger-things',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=stranger+things',free:false}], type:'tv',    genre:'Sci-Fi',  overview:"A group of kids in a small Indiana town uncover a government conspiracy and encounter supernatural forces after one of them mysteriously disappears."},
  {id:1433,  name:'Seinfeld',              poster:'/aCw8ONfyz3AhngVQa1E2Ss4KSUQ.jpg', rating:8.8, services:[{name:'Pluto TV',url:'https://pluto.tv/search#seinfeld',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=seinfeld',free:false}], type:'tv',    genre:'Comedy',  overview:"Jerry Seinfeld and his eccentric group of New York City friends navigate the minutiae of everyday life in this classic 'show about nothing.'"},
  {id:71146, name:'Narcos',                poster:'/rTmal9fDbwh5F0waol2hq35U4ah.jpg', rating:8.7, services:[{name:'Pluto TV',url:'https://pluto.tv/search#narcos',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=narcos',free:false}], type:'tv',    genre:'Crime',   overview:"The true story of the rise and fall of notorious Colombian drug lord Pablo Escobar and the DEA agents who hunted him across two continents."},
  {id:1434,  name:'Gossip Girl',           poster:'/eSLh9K2MWDYmRZCotFymaxI9U2p.jpg', rating:7.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#gossip-girl',free:true},{name:'Max',url:'https://play.max.com/search?query=gossip+girl',free:false}], type:'tv',    genre:'Drama',   overview:"An anonymous blogger known as Gossip Girl chronicles the scandalous lives of privileged teens on Manhattan's Upper East Side."},
  {id:30984, name:'Naruto',                poster:'/xppeysfvDKVx775MFuH8Z9hyABj.jpg', rating:8.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#naruto',free:true},{name:'Crunchyroll',url:'https://www.crunchyroll.com/search?q=naruto',free:false},{name:'Hulu',url:'https://www.hulu.com/search?q=naruto',free:false}], type:'tv',    genre:'Anime',   overview:"A young ninja with a powerful demon fox sealed inside him dreams of becoming the greatest ninja in his village, earning respect through hard work and determination."},
  {id:27205, name:'Inception',             poster:'/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', rating:8.4, services:[{name:'Pluto TV',url:'https://pluto.tv/search#inception',free:true},{name:'Max',url:'https://play.max.com/search?query=inception',free:false}], type:'movie', genre:'Sci-Fi',  overview:"A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."},
  {id:475557,name:'Joker',                 poster:'/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', rating:8.2, services:[{name:'Pluto TV',url:'https://pluto.tv/search#joker',free:true},{name:'Max',url:'https://play.max.com/search?query=joker',free:false}], type:'movie', genre:'Drama',   overview:"Failed stand-up comedian Arthur Fleck descends into madness and becomes the infamous Joker, igniting a violent revolution in Gotham City."},
  {id:11324, name:'Shutter Island',        poster:'/52d8HgHFKsiKHFPZ7cWJGYi3NdM.jpg', rating:8.1, services:[{name:'Pluto TV',url:'https://pluto.tv/search#shutter-island',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Thriller',overview:"A U.S. Marshal investigates the disappearance of a patient from a hospital for the criminally insane on a remote island — and begins to question his own sanity."},
  {id:75006, name:'The Good Place',        poster:'/2owZFClFHqDAvnvAkGhEbEBYFQD.jpg', rating:8.2, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+good+place',free:true},{name:'Netflix',url:'https://www.netflix.com/search?q=the+good+place',free:false}], type:'tv',    genre:'Comedy',  overview:"A selfish woman is accidentally sent to the afterlife's Good Place and must pretend to belong while actually trying to become a better person."},
  {id:8592,  name:'Parks and Recreation',  poster:'/iFHuMUBOZbfVAGBFaRcsZsqMmgN.jpg', rating:8.6, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=parks+and+recreation',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=parks+and+recreation',free:false}], type:'tv',    genre:'Comedy',  overview:"The mockumentary follows the Parks and Recreation Department of Pawnee, Indiana and the lovably optimistic Leslie Knope as she tries to make her small town a better place."},
  {id:48891, name:'Brooklyn Nine-Nine',    poster:'/hgRMSOt7a1b8qyQR68vUixJPang.jpg', rating:8.4, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=brooklyn+nine-nine',free:true},{name:'Hulu',url:'https://www.hulu.com/search?q=brooklyn+nine-nine',free:false}], type:'tv',    genre:'Comedy',  overview:"A talented but immature NYPD detective gets a new commanding officer — a stern, no-nonsense captain — which forces him to shape up or ship out."},
  {id:37680, name:'Downton Abbey',         poster:'/lf9sn83G0B9QpMHZXBCiTbMBoRT.jpg', rating:8.2, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=downton+abbey',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=downton+abbey',free:false}], type:'tv',    genre:'Drama',   overview:"The lives of the aristocratic Crawley family and their servants are intertwined in the grand Downton Abbey estate in early twentieth-century England."},
  {id:76479, name:'The Boys',              poster:'/stTEycfG9928HYGEISKFauu24V.jpg',  rating:8.7, services:[{name:'Peacock',url:'https://www.peacocktv.com/search?q=the+boys',free:true},{name:'Prime Video',url:'https://www.amazon.com/s?k=the+boys',free:false}], type:'tv',    genre:'Action',  overview:"A group of vigilantes sets out to take down corrupt superheroes who abuse their powers, in a world where supes are managed by a powerful corporation."},
  {id:106,   name:'Catch Me If You Can',   poster:'/lyVfHMR4DAPG7aqVXXHgQ9FJNwD.jpg', rating:8.1, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=catch+me+if+you+can+2002+full+movie+free+official',free:true},{name:'Peacock',url:'https://www.peacocktv.com/search?q=catch+me+if+you+can',free:false}], type:'movie', genre:'Drama',   overview:"The true story of Frank Abagnale Jr., who successfully performed cons worth millions of dollars as a Pan Am pilot, doctor, and legal prosecutor — before the age of 21."},
  {id:10696, name:'My Cousin Vinny',       poster:'/aEFCf8bXFJMfzjb0MDVj1u0Spmg.jpg', rating:7.6, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=my+cousin+vinny+1992+full+movie+free+official',free:true},{name:'Tubi',url:'https://tubitv.com/search/my+cousin+vinny',free:true}], type:'movie', genre:'Comedy',  overview:"Two New Yorkers are arrested in rural Alabama for a murder they didn't commit, and their only hope is a brash, inexperienced cousin who recently passed the bar."},
  {id:289,   name:'Casablanca',            poster:'/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg', rating:8.5, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=casablanca+1942+full+movie+official+free',free:true},{name:'Max',url:'https://play.max.com/search?query=casablanca',free:false}], type:'movie', genre:'Classic', overview:"A cynical American expatriate struggles to decide whether to help his former lover and her fugitive husband escape from the Nazis in WWII Casablanca."},
  {id:11232, name:'Saturday Night Fever',  poster:'/qL9vgkzJCAL6SMGalrfV1bEtE8j.jpg', rating:7.5, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=saturday+night+fever+1977+full+movie+free+official',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Classic', overview:"A Brooklyn teenager finds escape from his dead-end life through his extraordinary talent on the dance floor of a local disco."},
  {id:240,   name:'The Godfather Part II', poster:'/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', rating:9.0, services:[{name:'YouTube',url:'https://www.youtube.com/results?search_query=godfather+part+2+full+movie+free+official',free:true},{name:'Paramount+',url:'https://www.paramountplus.com/search/',free:false}], type:'movie', genre:'Crime',   overview:"The early life of Vito Corleone is portrayed alongside his son Michael's expansion of the family crime empire in this celebrated sequel."},
];

// Saved free shows from searches
let savedFreeShows = JSON.parse(localStorage.getItem('shufflr_free')||'[]');

function renderFreeTab(filter){
  freeFilter = filter || freeFilter || 'all';
  const services = ['all','Tubi','Pluto TV','Peacock','Plex','YouTube'];
  const genres = ['All','Comedy','Drama','Action','Horror','Sci-Fi','Anime','Fantasy','Crime','Family'];

  let html = `<div style="margin-bottom:20px;">
    <div class="section-header" style="color:#22c55e;text-shadow:0 0 8px rgba(34,197,94,0.4);">FREE TO WATCH</div>
    <div style="font-size:0.78rem;color:var(--muted);margin-bottom:14px;">Shows and movies you can watch for free right now.</div>
    <div class="free-service-row">`;
  services.forEach(s=>{
    html+=`<button class="free-service-btn ${freeFilter===s.toLowerCase()||freeFilter===s?'active':''}"
      onclick="renderFreeTab('${s}')">${s==='all'?'All Services':s}</button>`;
  });
  html+=`</div></div>`;

  // Combine hardcoded + saved
  const allFree = [...FREE_SHOWS, ...savedFreeShows.filter(s=>!FREE_SHOWS.find(f=>f.id===s.id))];
  const filtered = freeFilter==='all'||freeFilter==='All Services'
    ? allFree
    : allFree.filter(s=>(s.services||[{name:s.service}]).some(sv=>sv.name===freeFilter));

  // Group by genre
  const genres_present = [...new Set(filtered.map(s=>s.genre))];
  genres_present.forEach(genre=>{
    const shows = filtered.filter(s=>s.genre===genre);
    html+=`<div class="section-header" style="margin-top:16px;">${genre.toUpperCase()}</div>`;
    html+=`<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">`;
    shows.forEach(s=>{
      const allSvcs = s.services || [{name:s.service||'Tubi', url:s.url, free:true}];
      html+=`<div class="ep-row" style="cursor:pointer;align-items:flex-start;padding:10px 12px;" onclick="loadFreeShow(${s.id},'${s.type}')">
        <img src="https://image.tmdb.org/t/p/w185${s.poster}" onerror="this.style.background='#1a1a1a'" style="width:52px;height:76px;border-radius:6px;flex-shrink:0;object-fit:cover;" />
        <div class="ep-info" style="padding:0 10px;min-width:0;">
          <div class="ep-name" style="margin-bottom:5px;">${s.name}</div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:7px;">
            ${allSvcs.map(sv=>`<a href="${sv.url}" target="_blank" onclick="event.stopPropagation()" class="free-tab-badge ${sv.free?'free-tab-badge-free':'free-tab-badge-sub'}">${sv.name}${sv.free?'<span class="free-tab-free-tag">FREE</span>':''}</a>`).join('')}
            <span style="font-size:0.68rem;color:var(--muted);margin-left:2px;display:flex;align-items:center;gap:5px;white-space:nowrap;">
              ${s.rating?`<span>${s.rating}/10</span><span style="opacity:0.3;">·</span>`:''}
              <span>${s.genre||''}</span>
            </span>
          </div>
          <div style="font-size:0.72rem;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${s.overview||''}</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  });

  if(!filtered.length) html+=`<div class="empty-state"><div class="empty-sub">No free shows found for this filter.</div></div>`;
  showMain(html);
}

async function loadFreeShow(id, type){
  freeScrollPos=document.getElementById('main-content').scrollTop;
  cameFromFree=true;
  if(type==='movie'){
    const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='movie';currentShow=show;
    // Set nav active state without triggering show restore
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    renderMovieMain(show);
  } else {
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';
    currentShow=show;
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    document.getElementById('search-input').value=show.name||'';
    // Set nav active state without triggering show restore
    ['shows','playlist','options'].forEach(n=>{
      const el=document.getElementById('nav-'+n);
      if(el) el.classList.toggle('active',n==='shows');
    });
    currentNav='shows';
    await loadSeasons(show.id);
  }
}

// HOME BUTTON
function goHome(){
  homeScrollPos=0;
  currentShow=null;allSeasons=[];allEpisodes={};highlightedEps=[];selectedSeason=null;
  blockedSeasons=new Set();
  lastShowNav={shows:null,movies:null};
  clearSeasonsSidebar();
  document.getElementById('search-input').value='';
  cameFromFree=false;
  renderHomeScreen(currentNav);
}

function goBackHome(){
  currentShow=null;allSeasons=[];allEpisodes={};highlightedEps=[];selectedSeason=null;
  blockedSeasons=new Set();
  clearSeasonsSidebar();
  document.getElementById('search-input').value='';
  cameFromFree=false;
  lastShowNav={shows:null,movies:null};
  const navTarget=homeNavType||currentNav||'shows';
  if(navTarget==='playlist'||navTarget==='options'){
    setNav(navTarget);
  }else{
    setNav('shows');
  }
}

// HELP
function showHelp(){
  obIndex=0;
  const s=obSteps[0];
  document.getElementById('ob-step').textContent=s.step;
  document.getElementById('ob-title').textContent=s.title;
  document.getElementById('ob-desc').textContent=s.desc;
  document.querySelectorAll('.onboard-dot').forEach((d,i)=>d.classList.toggle('active',i===0));
  document.querySelector('.onboard-btn').textContent='NEXT';
  document.getElementById('onboarding').style.display='flex';
}
function closeHelp(){
  document.getElementById('onboarding').style.display='none';
}

// HOME SCREEN
const TV_GENRES = [
  { name: 'POPULAR RIGHT NOW',    ids: [1396,66732,63174,1418,84958,60625,76479,71912], type:'tv' },
  { name: 'COMEDY',               ids: [2316,1668,4607,61818,68004,2190,1421,75006,100088], type:'tv' },
  { name: 'ACTION & ADVENTURE',   ids: [1402,76479,60059,71912,88396,63174,84958,37854], type:'tv' },
  { name: 'DRAMA',                ids: [1396,57243,79744,87108,71712,66732,63351,82856], type:'tv' },
  { name: 'ANIME',                ids: [46260,30984,37854,72636,85937,65930,70881,94664], type:'tv' },
  { name: 'CRIME & THRILLER',     ids: [1396,60735,46952,87108,79744,4489,73586,82856], type:'tv' },
  { name: 'SCI-FI & FANTASY',     ids: [1399,60625,66732,63174,84958,76479,71912,88396], type:'tv' },
  { name: 'FAMILY & KIDS',        ids: [4614,60554,38472,77169,44217,36716,75219,65798], type:'tv' },
  { name: 'REALITY & GAME SHOWS', ids: [2178,3572,4291,39342,62688,71643,44217,37680], type:'tv' },
  { name: 'HORROR',               ids: [62822,87175,95403,71712,66190,63351,90228,82856], type:'tv' },
  { name: 'DOCUMENTARY',          ids: [87108,63351,71146,96648,99785,95956,87259,67915], type:'tv' },
  { name: 'CLASSICS',             ids: [1668,2316,4607,1421,2190,2287,1622,4135], type:'tv' },
  { name: 'SUPERHERO',            ids: [61889,62285,88329,71663,67466,71912,84958,76479], type:'tv' },
  { name: 'TALK & LATE NIGHT',    ids: [2224,4573,1489,37685,68507,38472,41056,67295], type:'tv' },
  { name: 'WESTERN',              ids: [73586,77680,86831,87949,79798,67915,82856,71712], type:'tv' },
];
const MOVIE_GENRES = [
  { name: 'POPULAR MOVIES',       ids: [550,238,424,19404,497,155,680,122], type:'movie' },
  { name: 'ACTION',               ids: [27205,299536,24428,157336,76341,475557,122,155], type:'movie' },
  { name: 'COMEDY',               ids: [98,105864,120,14160,218,862,585,13],  type:'movie' },
  { name: 'DRAMA',                ids: [238,424,497,19404,389,550,637,769],   type:'movie' },
  { name: 'HORROR',               ids: [694,539,745,11232,37735,185,23193,577], type:'movie' },
  { name: 'SCI-FI',               ids: [27205,157336,49026,24428,76341,87101,329,475557], type:'movie' },
  { name: 'ANIMATION',            ids: [862,585,920,12,14,585,12444,10193],   type:'movie' },
  { name: 'THRILLER',             ids: [680,550,274,807,539,949,78,106],      type:'movie' },
  { name: 'ROMANCE',              ids: [19404,597,105864,111,401478,508965,396535,522627], type:'movie' },
  { name: 'DOCUMENTARY',          ids: [284052,12444,98,106,246655,49596,70,244786], type:'movie' },
  { name: 'CLASSICS',             ids: [238,425,769,637,389,240,429,11],      type:'movie' },
  { name: 'SUPERHERO',            ids: [299536,24428,49026,99861,284053,271110,284054,209112], type:'movie' },
];

async function fetchShow(id, type='tv'){
  try{
    const r=await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${KEY}&language=en-US`);
    if(!r.ok)return null;
    return await r.json();
  }catch(e){return null;}
}

// Known free streaming services
const FREE_SERVICES = [8739,2,7,257,613,1895,593,531,37,196,1796,1870,677,692,1899];
// Provider homepage fallbacks (used when no direct ID available)
const PROVIDER_HOME = {
  8:'https://www.netflix.com',
  9:'https://www.amazon.com/prime-video',
  337:'https://www.disneyplus.com',
  384:'https://play.max.com',
  15:'https://www.hulu.com',
  386:'https://tv.apple.com',
  531:'https://tubitv.com',
  257:'https://pluto.tv',
  387:'https://www.peacocktv.com',
  1855:'https://www.paramountplus.com',
  583:'https://www.crunchyroll.com',
  2:'https://www.apple.com/apple-tv-plus',
  192:'https://www.youtube.com',
};
// Provider name to deep link base URLs (search fallback)
const PROVIDER_LINKS = {
  8:'https://www.netflix.com/search?q=',
  9:'https://www.amazon.com/s?k=',
  337:'https://www.disneyplus.com/search/',
  384:'https://play.max.com/search?q=',
  15:'https://www.hulu.com/search?q=',
  386:'https://tv.apple.com/search?term=',
  531:'https://tubitv.com/search/',
  257:'https://pluto.tv/search#',
  387:'https://www.peacocktv.com/search?q=',
  1855:'https://www.paramountplus.com/search/',
  583:'https://www.crunchyroll.com/search?q=',
};

async function fetchProviders(id, type='tv', showName=''){
  try{
    const r=await fetch(`https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${KEY}`);
    const d=await r.json();
    const region=userRegion||'US';
    const us=(d.results||{})[region]||(d.results||{}).US||{};
    const flatrate=us.flatrate||[];
    const free=us.free||[];
    const ads=us.ads||[];
    const rent=us.rent||[];
    const buy=us.buy||[];
    const allFree=[...free,...ads].filter((v,i,a)=>a.findIndex(t=>t.provider_id===v.provider_id)===i);
    const allSub=flatrate.filter(p=>!allFree.find(f=>f.provider_id===p.provider_id));
    const allRent=rent.filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)&&!allSub.find(s=>s.provider_id===p.provider_id)).slice(0,3);
    return {free:allFree, sub:allSub, flatrate:allSub, rent:allRent, link:us.link||getEpLink()};
  }catch(e){return null;}
}

function buildFallbackProviders(showName){
  return `<div class="wtw-section-label">Find this title on</div><div class="providers-wrap"><a class="provider-badge provider-sub" href="https://play.max.com" target="_blank">Max</a><a class="provider-badge provider-sub" href="https://www.netflix.com" target="_blank">Netflix</a><a class="provider-badge provider-sub" href="https://www.hulu.com" target="_blank">Hulu</a><a class="provider-badge provider-free" href="https://tubitv.com" target="_blank">Tubi <span class="free-tag">FREE</span></a></div>`;
}

function buildProviderHTML(pd, showName){
  const link=(pd&&pd.link)||getEpLink();
  const allFree=[...(pd&&pd.free||[])].filter((v,i,a)=>a.findIndex(t=>t.provider_id===v.provider_id)===i);
  const allSub=((pd&&pd.flatrate)||(pd&&pd.sub)||[]).filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)).slice(0,8);
  const allRent=((pd&&pd.rent)||[]).filter(p=>!allFree.find(f=>f.provider_id===p.provider_id)&&!allSub.find(s=>s.provider_id===p.provider_id)).slice(0,3);

  if(!allFree.length&&!allSub.length&&!allRent.length) return '';

  // All providers in one row under one label
  // Use homepage if no direct ID match, never use Google
  const getProviderUrl = (p) => PROVIDER_HOME[p.provider_id] || getEpLink();
  let html=`<div class="wtw-section-label">Find this title on</div><div class="providers-wrap">`;
  allFree.forEach(p=>{
    html+=`<a class="provider-badge provider-free" href="${getProviderUrl(p)}" target="_blank"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name} <span class="free-tag">FREE</span></a>`;
  });
  allSub.forEach(p=>{
    html+=`<a class="provider-badge provider-sub" href="${getProviderUrl(p)}" target="_blank"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name}</a>`;
  });
  allRent.forEach(p=>{
    html+=`<a class="provider-badge provider-rent" href="${getProviderUrl(p)}" target="_blank"><img src="https://image.tmdb.org/t/p/original${p.logo_path}" onerror="this.style.display='none'" />${p.provider_name}</a>`;
  });
  html+=`</div>`;
  return html;
}

// renderProviders handled inline by buildProviderHTML

async function renderHomeScreen(navType){
  homeNavType = navType || currentNav || 'shows';

  let allPlaylists = playlists;
  const bridgePlaylists = await getPlaylistsFromBridge();
  if (bridgePlaylists?.length) {
    allPlaylists = bridgePlaylists;
    playlists = bridgePlaylists;
    homePlaylistsCache = bridgePlaylists;
  }

  const yourShowsSection = getActivePlaylistShowsForHome(allPlaylists);
  const yourShows = (yourShowsSection.items || []).map(item => item.show);

  let html=`<div class="home-wrap">`;

  html += await buildYourPlaylistsHtml();

  let playlistCardLookup=null;
  if(homePlaylistsCache.length){
    const connectedService=localStorage.getItem('shufflr_service')||'max';
    const filtered=homePlaylistsCache.filter(p=>(p.service||'max')===connectedService);
    if(filtered.length){
      playlistCardLookup={allPlaylists:homePlaylistsCache,filtered};
    }
  }

  if(yourShows.length){
    html+=buildYourShowsSectionHtml(yourShowsSection);
    html+=`<div class="genre-section" id="recs-section" style="margin-top:4px;">
      <div class="genre-title">-- BECAUSE YOU WATCHED <span id="recs-title" style="color:var(--blue);">${(yourShows[0].name||yourShows[0].title||'').toUpperCase()}</span> --</div>
      <div class="h-scroll-wrap" id="recs-wrap">
        ${[1,2,3,4].map(()=>`<div class="ep-card-h" style="background:var(--surface);border-color:var(--border);"><div style="width:100%;height:220px;background:var(--surface2);border-radius:0;"></div><div class="ep-card-h-body"><div style="height:10px;background:var(--border);border-radius:4px;margin-bottom:6px;width:80%;"></div><div style="height:8px;background:var(--border);border-radius:4px;width:50%;"></div></div></div>`).join('')}
      </div>
    </div>`;
  }

  let recentlyWatchedEntries=[];
  if(typeof window.shufflrIsLoggedIn==='function'&&await window.shufflrIsLoggedIn()){
    const recentSection=await loadRecentlyWatchedOnMaxSection(allPlaylists);
    html+=recentSection.html;
    recentlyWatchedEntries=recentSection.entries;
  }

  html+=`</div>`;
  showMain(html);
  setTimeout(()=>{ document.getElementById('main-content').scrollTop=homeScrollPos; },50);

  if(yourShows.length){
    resolveYourShowsPosters(yourShowsSection.items);
  }
  if(playlistCardLookup){
    resolvePlaylistCardPosters(playlistCardLookup.allPlaylists,playlistCardLookup.filtered);
  }
  if(recentlyWatchedEntries.length){
    resolveRecentlyWatchedPosters(recentlyWatchedEntries);
  }

  if(yourShows.length){
    const seed = yourShows[0];
    const seedType = seed.release_date ? 'movie' : 'tv';
    const recentIds = new Set(yourShows.map(s=>String(s.id)));
    if(!/^\d+$/.test(String(seed.id))){
      document.getElementById('recs-section')&&document.getElementById('recs-section').remove();
      return;
    }
    try{
      const r = await fetch(`https://api.themoviedb.org/3/${seedType}/${seed.id}/recommendations?api_key=${KEY}&language=en-US&page=1`);
      const d = await r.json();
      const recs = (d.results||[]).filter(s=>s.poster_path&&!recentIds.has(s.id)).slice(0,10);
      const wrap = document.getElementById('recs-wrap');
      if(!wrap) return;
      if(!recs.length){ document.getElementById('recs-section')&&document.getElementById('recs-section').remove(); return; }
      wrap.innerHTML = recs.map(s=>`
        <div class="ep-card-h" onclick="homeTileClick(${s.id},'${seedType}')">
          <img src="${IMG+'w185'+s.poster_path}" onerror="this.style.background='#1a1a1a'" style="width:100%;height:220px;object-fit:cover;background:#1a1a1a;" />
          <div class="ep-card-h-body">
            <div class="ep-card-h-name">${s.name||s.title||''}</div>
            <div class="ep-card-h-meta">${((s.first_air_date||s.release_date)||'').slice(0,4)}${s.vote_average?` · ${s.vote_average.toFixed(1)}/10`:''}</div>
          </div>
        </div>`).join('');
    }catch(e){
      document.getElementById('recs-section')&&document.getElementById('recs-section').remove();
    }
  }
}

async function renderHomeScreen_OLD(){
  // This function is replaced by the one above
  const allPlShows=playlists.flatMap(p=>p.shows);
  if(allPlShows.length){
    html+=`<div class="genre-section">
      <div class="genre-title">-- FROM YOUR PLAYLISTS --</div>
      <div class="genre-row">`;
    [...new Map(allPlShows.map(s=>[s.id,s])).values()].slice(0,8).forEach(s=>{
      html+=`<div class="show-tile" onclick="homeTileClick(${s.id},'tv')">
        <img src="${s.poster_path?IMG+'w185'+s.poster_path:''}" onerror="this.style.background='#1a1a1a'" />
        <div class="show-tile-name">${s.name||s.title||''}</div>
        <div class="show-tile-rating">${s.vote_average?s.vote_average.toFixed(1):''}</div>
      </div>`;
    });
    html+=`</div></div>`;
  }

  html+=`<div id="genre-sections"></div></div>`;
  showMain(html);

  // Load genre sections async so page loads fast
  const genreEl=document.getElementById('genre-sections');
  if(!genreEl)return;
  for(const genre of GENRES){
    const shows=await Promise.all(genre.ids.map(id=>fetchShow(id)));
    const valid=shows.filter(s=>s&&s.poster_path);
    if(!valid.length)continue;
    let ghtml=`<div class="genre-section">
      <div class="genre-title">-- ${genre.name} --</div>
      <div class="genre-row">`;
    valid.forEach(s=>{
      ghtml+=`<div class="show-tile" onclick="homeTileClick(${s.id},'tv')">
        <img src="${IMG+'w185'+s.poster_path}" onerror="this.style.background='#1a1a1a'" />
        <div class="show-tile-name">${s.name||''}</div>
        <div class="show-tile-rating">${s.vote_average?s.vote_average.toFixed(1):''}</div>
      </div>`;
    });
    ghtml+=`</div></div>`;
    if(document.getElementById('genre-sections'))
      document.getElementById('genre-sections').innerHTML+=ghtml;
  }
}

async function homeTileClick(id,type){
  if(type==='movie'){
    const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='movie';
    lastShowNav.movies=show;
    currentShow=show;
    renderMovieMain(show);
  } else {
    const r=await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${KEY}`);
    const show=await r.json();
    currentType='tv';
    lastShowNav.shows=show;
    setNav('shows');
    document.getElementById('search-input').value=show.name||'';
    currentShow=show;
    blockedSeasons=new Set();selectedSeason=null;allEpisodes={};highlightedEps=[];
    recentShows=[show,...recentShows.filter(s=>s.id!==show.id)].slice(0,10);
    localStorage.setItem('shufflr_recent',JSON.stringify(recentShows));
    await loadSeasons(show.id);
  }
}

// OPTIONS
const SHUFFLR_LANGUAGES=[
  {code:'en',label:'English'},
  {code:'es',label:'Spanish'},
  {code:'fr',label:'French'},
  {code:'pt',label:'Portuguese'},
  {code:'ja',label:'Japanese'},
];

function getSavedLanguage(){
  return localStorage.getItem('shufflr_language')||'en';
}

function setLanguage(code){
  localStorage.setItem('shufflr_language',code);
  if(currentNav==='options')renderOptionsPage();
}

function renderOptionsPage(){
  let loggedIn=false;
  try{
    const raw=localStorage.getItem(SHUFFLR_SUPABASE_SESSION_KEY);
    loggedIn=!!(raw&&JSON.parse(raw)?.userId);
  }catch(e){}
  const greetingText=loggedIn?'HELLO':'SIGN IN TO GET STARTED';
  const lang=getSavedLanguage();
  const langButtons=SHUFFLR_LANGUAGES.map(l=>(
    `<button type="button" class="options-lang-btn ${lang===l.code?'active':''}" onclick="setLanguage('${l.code}')">${l.label}</button>`
  )).join('');
  const helpItems=obSteps.map(s=>(
    `<div class="options-help-item">
      <div class="options-help-step">${s.step}</div>
      <div class="options-help-title">${s.title}</div>
      <div class="options-help-desc">${String(s.desc).replace(/<[^>]+>/g,'')}</div>
    </div>`
  )).join('');

  const html=`<div class="options-page">
    <div class="options-greeting-card">
      <div class="options-greeting-smiley">${YOUR_SHOWS_SMILEY_SVG}</div>
      <div class="options-greeting-text">${greetingText}</div>
    </div>

    <div class="options-section">
      <div class="options-section-title">LANGUAGE</div>
      <div class="options-section-body">
        <p class="options-desc">Choose Shufflr's display language.</p>
        <div class="options-lang-group">${langButtons}</div>
      </div>
    </div>

    <div class="options-section">
      <div class="options-section-title">ACCOUNT</div>
      <div class="options-section-body">
        <div id="auth-section" class="auth-section">
          <div id="auth-logged-out">
            <input class="options-input auth-input" id="auth-email" type="email" placeholder="Email" autocomplete="email" />
            <input class="options-input auth-input" id="auth-password" type="password" placeholder="Password" autocomplete="current-password" />
            <div class="auth-btn-row">
              <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-signup-btn">Sign Up</button>
              <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-login-btn">Log In</button>
            </div>
          </div>
          <div id="auth-logged-in" style="display:none;">
            <div class="auth-user-email options-account-email" id="auth-user-email"></div>
            <button type="button" class="options-btn options-btn-secondary auth-btn" id="auth-logout-btn">Log Out</button>
          </div>
          <div id="auth-message" class="auth-message" style="display:none;"></div>
        </div>
      </div>
    </div>

    <div class="options-section">
      <div class="options-section-title">FEEDBACK</div>
      <div class="options-section-body">
        <p class="options-desc">Got an idea or found a bug? We want to hear it.</p>
        <textarea id="options-feedback-text" class="options-textarea" placeholder="Type your feedback here..."></textarea>
        <button type="button" class="options-btn options-btn-primary" onclick="submitOptionsFeedback()">Submit</button>
      </div>
    </div>

    <div class="options-section">
      <div class="options-section-title">HELP</div>
      <div class="options-section-body">
        <div class="options-help-list">${helpItems}</div>
        <button type="button" class="options-btn options-btn-primary" onclick="showHelp()">Replay Onboarding</button>
      </div>
    </div>
  </div>`;

  showMain(html);
  document.activeElement?.blur();
  if(typeof window.shufflrRefreshAuthUI==='function')window.shufflrRefreshAuthUI();
}

function submitOptionsFeedback(){
  const text=document.getElementById('options-feedback-text')?.value?.trim();
  if(!text)return;
  console.log('[Shufflr Feedback]',text);
  document.getElementById('options-feedback-text').value='';
  showToast('FEEDBACK SENT!');
}

// SHARE PLAYLIST
function sharePlaylist(pi){
  const p=playlists[pi];
  const shows=p.shows.map(s=>s.name||s.title).join(', ');
  const text=`Check out my Shufflr playlist "${p.name}": ${shows}`;
  navigator.clipboard.writeText(text).then(()=>showToast('PLAYLIST COPIED!'));
}

// DRAG TO REORDER
let dragPi=-1,dragSi=-1;
function dragStart(e,pi,si){
  dragPi=pi;dragSi=si;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
}
function dragOver(e){
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
  e.dataTransfer.dropEffect='move';
}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function dragDrop(e,pi,si){
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if(dragPi!==pi||dragSi===si)return;
  const shows=playlists[pi].shows;
  const moved=shows.splice(dragSi,1)[0];
  shows.splice(si,0,moved);
  savePlaylists();
  renderPlaylistPage();
}
function dragEnd(e){e.currentTarget.classList.remove('dragging');}
function showToast(msg){
  const t=document.getElementById('share-toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2000);
}
function onSearchFocus(){
  showRecent();
}
function openDropdown(){
  document.getElementById('dropdown').classList.add('open');
  document.getElementById('search-overlay').style.display='block';
}
function closeSearch(){
  const drop=document.getElementById('dropdown');
  drop.classList.remove('open');
  drop.innerHTML='';
  document.getElementById('search-overlay').style.display='none';
  document.getElementById('search-input').blur();
}
// Desktop: click outside closes dropdown; delegated card clicks
document.addEventListener('click',e=>{
  const yourShowCard=e.target.closest('.your-show-card');
  if(yourShowCard){
    const pi=parseInt(yourShowCard.dataset.showPlaylistIndex,10);
    const si=parseInt(yourShowCard.dataset.showIndex,10);
    if(Number.isFinite(pi)&&Number.isFinite(si))openYourShowDetailPage(pi,si);
    return;
  }
  const rwCard=e.target.closest('.recently-watched-card');
  if(rwCard){
    let url=rwCard.dataset.recentlyWatchedMaxUrl||'';
    if(!url)return;
    try{
      url=decodeURIComponent(url);
    }catch{}
    window.open(url,'_blank');
    return;
  }
  if(!e.target.closest('.search-wrap')&&!e.target.closest('#search-overlay')) closeSearch();
});

// ---- PWA SETUP ----
// Generate manifest dynamically
const manifest = {
  name: "Shufflr",
  short_name: "Shufflr",
  description: "Random TV and Movies, Done Right",
  start_url: ".",
  display: "standalone",
  background_color: "#000000",
  theme_color: "#000000",
  orientation: "portrait-primary",
  icons: [
    {
      src: "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="black"/><rect width="512" height="512" rx="80" fill="black" stroke="#23A8E0" stroke-width="16"/><polyline points="300,130 390,130 390,220" fill="none" stroke="#23A8E0" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><line x1="122" y1="382" x2="390" y2="130" stroke="#23A8E0" stroke-width="44" stroke-linecap="round"/><polyline points="390,292 390,382 300,382" fill="none" stroke="#23A8E0" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><line x1="270" y1="272" x2="390" y2="382" stroke="#23A8E0" stroke-width="44" stroke-linecap="round"/></svg>`),
      sizes: "512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
};

const manifestBlob = new Blob([JSON.stringify(manifest)], {type:'application/json'});
const manifestURL = URL.createObjectURL(manifestBlob);
document.getElementById('pwa-manifest').setAttribute('href', manifestURL);

// Apple touch icon set in HTML head as base64

// Register service worker for offline support
if('serviceWorker' in navigator) {
  const swCode = `
    const CACHE = 'shufflr-v1';
    const ASSETS = ['/'];
    self.addEventListener('install', e => {
      e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    });
    self.addEventListener('fetch', e => {
      e.respondWith(
        caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/')))
      );
    });
  `;
  const swBlob = new Blob([swCode], {type:'application/javascript'});
  const swURL = URL.createObjectURL(swBlob);
  navigator.serviceWorker.register(swURL).catch(()=>{});
}

// Show "Add to Home Screen" prompt on mobile after 30 seconds
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if(deferredPrompt) showInstallPrompt();
  }, 30000);
});

function showInstallPrompt() {
  const toast = document.getElementById('share-toast');
  toast.textContent = 'ADD TO HOME SCREEN';
  toast.style.cursor = 'pointer';
  toast.classList.add('show');
  toast.onclick = () => {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      toast.classList.remove('show');
    });
  };
}

// ── TIMER SYSTEM ─────────────────────────────────────────────────────────────
function startWatching(){
  const ep = _currentSheetEp;
  if(!ep) return;
  closeEpSheet();

  // Request notification permission first
  requestNotifPermission().then(()=>{
    // TEST MODE: fixed 60s runtime, notification at 10s before end
    const runtimeMins = 1; // TEST: 1 minute
    const runtimeSecs = 60; // TEST: 60 seconds

    // Store ep info for timer display
    _timerEp = {
      name: ep.name || 'Episode',
      code: `S${String(ep.seasonNum||ep.season_number||'').padStart(2,'0')} E${String(ep.episode_number||'').padStart(2,'0')}`,
      runtime: runtimeMins,
    };

    // Find next queued episode (episode after this one in highlightedEps, or next in season)
    _timerNextEp = getNextEpisode(ep);

    // Phase 1: 60 second buffer (user finding the episode)
    startTimerPhase1(runtimeSecs);

    // Open streaming service
    window.open(getEpLink(), '_blank');
  });
}

function getNextEpisode(currentEp){
  // Look in queue first
  const queueIdx = highlightedEps.findIndex(e=>e.episode_number===currentEp.episode_number&&(e.seasonNum||e.season_number)===currentEp.seasonNum);
  if(queueIdx >= 0 && queueIdx < highlightedEps.length - 1){
    return highlightedEps[queueIdx + 1];
  }
  // Otherwise next in season
  const seasonEps = allEpisodes[currentEp.seasonNum] || [];
  const epIdx = seasonEps.findIndex(e=>e.episode_number===currentEp.episode_number);
  if(epIdx >= 0 && epIdx < seasonEps.length - 1){
    return {...seasonEps[epIdx+1], seasonNum: currentEp.seasonNum};
  }
  // Try next season
  const nextSeasonNum = (currentEp.seasonNum||1) + 1;
  const nextSeasonEps = allEpisodes[nextSeasonNum];
  if(nextSeasonEps && nextSeasonEps.length){
    return {...nextSeasonEps[0], seasonNum: nextSeasonNum};
  }
  return null;
}

function startTimerPhase1(runtimeSecs){
  _timerRuntimeSecs = runtimeSecs;
  _timerPhase = 'buffer';
  _timerStartTimestamp = Date.now();
  _timerSecondsLeft = _timerBufferSecs;
  _timerTotalSeconds = _timerBufferSecs;
  _timerNotifScheduled = false;

  document.getElementById('timer-phase-label').textContent = 'FINDING EPISODE...';
  document.getElementById('timer-sub-label').textContent = 'Starting in 10s — go find the episode now';
  document.getElementById('timer-ep-name').textContent = `${_timerEp.code} — ${_timerEp.name}`;
  document.getElementById('timer-bar').classList.add('open');

  clearInterval(_timerInterval);
  clearTimeout(_timerNotifTimeout);

  _timerInterval = setInterval(()=>tickTimer(), 500);
}

function tickTimer(){
  const now = Date.now();
  if(_timerPhase === 'buffer'){
    const elapsed = Math.floor((now - _timerStartTimestamp) / 1000);
    _timerSecondsLeft = Math.max(0, _timerBufferSecs - elapsed);
    _timerTotalSeconds = _timerBufferSecs;
    updateTimerDisplay();
    if(_timerSecondsLeft <= 0){
      // Transition to episode phase
      _timerPhase = 'episode';
      _timerStartTimestamp = Date.now();
      _timerSecondsLeft = _timerRuntimeSecs;
      _timerTotalSeconds = _timerRuntimeSecs;
      document.getElementById('timer-phase-label').textContent = 'NOW WATCHING';
      document.getElementById('timer-sub-label').textContent = `${_timerEp.runtime} min episode · Next up ready`;
      // Schedule notification using setTimeout from NOW — survives background better
      scheduleNotification(_timerRuntimeSecs - _timerNotifAt);
    }
  } else if(_timerPhase === 'episode'){
    const elapsed = Math.floor((now - _timerStartTimestamp) / 1000);
    _timerSecondsLeft = Math.max(0, _timerRuntimeSecs - elapsed);
    _timerTotalSeconds = _timerRuntimeSecs;
    updateTimerDisplay();
    if(_timerSecondsLeft <= 0){
      clearInterval(_timerInterval);
      document.getElementById('timer-bar').classList.remove('open');
    }
  }
}

function scheduleNotification(delaySecs){
  clearTimeout(_timerNotifTimeout);
  _timerNotifTimeout = setTimeout(()=>{
    fireNextEpisodeNotification();
  }, delaySecs * 1000);
}

function updateTimerDisplay(){
  const m = Math.floor(Math.abs(_timerSecondsLeft) / 60);
  const s = Math.abs(_timerSecondsLeft) % 60;
  document.getElementById('timer-display').textContent = `${m}:${String(s).padStart(2,'0')}`;
  const pct = Math.max(0, (_timerSecondsLeft / _timerTotalSeconds) * 100);
  document.getElementById('timer-progress-fill').style.width = pct + '%';
}

function cancelTimer(){
  clearInterval(_timerInterval);
  clearTimeout(_timerNotifTimeout);
  _timerInterval = null;
  _timerNotifTimeout = null;
  _timerEp = null;
  _timerNextEp = null;
  _timerPhase = null;
  document.getElementById('timer-bar').classList.remove('open');
  showToast('TIMER CANCELLED');
}

function fireNextEpisodeNotification(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const nextName = _timerNextEp
    ? `Up Next: S${String(_timerNextEp.seasonNum||'').padStart(2,'0')} E${String(_timerNextEp.episode_number||'').padStart(2,'0')} — ${_timerNextEp.name||'Next Episode'}`
    : 'Your next shuffled episode is ready!';

  const notif = new Notification('Shufflr ▶', {
    body: nextName,
    icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="black"/><polyline points="20,5 26,5 26,11" fill="none" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="27" x2="26" y2="5" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round"/><polyline points="26,21 26,27 20,27" fill="none" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="18" y1="19" x2="26" y2="27" stroke="#23A8E0" stroke-width="2.5" stroke-linecap="round"/></svg>'),
    tag: 'shufflr-next',
    requireInteraction: true,
  });

  notif.onclick = ()=>{
    window.focus();
    notif.close();
    // Open next episode sheet if available
    if(_timerNextEp){
      openEpSheet(_timerNextEp.episode_number, _timerNextEp.seasonNum);
    }
  };
}

function askNotifPermissionOnLoad(){
  if(!('Notification' in window)){
    showToast('NOTIFICATIONS NOT SUPPORTED');
    return;
  }
  if(Notification.permission === 'granted'){
    showToast('NOTIFICATIONS ALREADY GRANTED');
    return;
  }
  if(Notification.permission === 'denied'){
    showToast('NOTIFICATIONS DENIED — CHECK SETTINGS');
    return;
  }
  setTimeout(async()=>{
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if(isIOS && !isStandalone){
      showToast('OPEN FROM HOME SCREEN FOR NOTIFICATIONS');
      return;
    }
    showToast('REQUESTING NOTIFICATION PERMISSION...');
    const result = await Notification.requestPermission();
    showToast('NOTIFICATIONS: '+result.toUpperCase());
  }, 2800);
}

async function requestNotifPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted') return;
  if(Notification.permission === 'denied'){
    showToast('ENABLE NOTIFICATIONS IN SETTINGS');
    return;
  }
  // Check iOS version compatibility
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if(isIOS && !isStandalone){
    showToast('ADD TO HOME SCREEN FOR NOTIFICATIONS');
    await new Promise(r=>setTimeout(r,2200));
    return;
  }
  await Notification.requestPermission();
}

// iOS specific — show manual instructions after 45 seconds
setTimeout(() => {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if(isIOS && !isStandalone && !localStorage.getItem('shufflr_ios_prompt')) {
    localStorage.setItem('shufflr_ios_prompt','1');
    showToast('TAP SHARE THEN ADD TO HOME SCREEN');
  }
}, 45000);
