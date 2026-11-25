import { createLocations } from './locations.js?v=0.5';
export function createFeatures(context) {
 const { esc, api, guarded, saveRecord, loadRecords, money, memberName, own, showImage } = context;
 const $ = selector => selector.startsWith('#') ? document.querySelector(selector) : context.$(selector);
 let pendingMapTarget=null;
 let refreshChat = null;
 let refreshNotifications = null;
 let renderGeneration = 0;
 let observer = null;
 let polling = false;
 const signedImages = new Map();
 const locations=createLocations({...context,get catalog(){return context.catalog;},icon,showOnMap(id){pendingMapTarget=id;context.go('Stadtkarte');}});
 const selected = { recipient: null };
 const visibleRecords = () => context.records;
 const receipts = new Map();
 function cleanup() {
  refreshChat = null;
  refreshNotifications = null;
  renderGeneration++;
  observer?.disconnect();
  observer = null;
 }
 function icon(item) {
  if (!item?.sprite) return '';
  return `<div class="gameicon" role="img" aria-label="${esc(item.name)}" style="background-image:url(${esc(item.image)});background-position:-${item.sprite.x}px -${item.sprite.y}px"></div>`;
 }
 async function uploadImage(file) {
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw Error('Bitte JPG, PNG oder WebP auswählen.');
  if (file.size > 1048576) throw Error('Ein Bild darf bis zu 1 MB groß sein.');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${context.me.id}/${crypto.randomUUID()}.${extension}`;
  const response = await fetch(context.url + '/storage/v1/object/clan-images/' + path, {
   method: 'POST',
   headers: { apikey: context.key, Authorization: 'Bearer ' + context.session.access_token, 'Content-Type': file.type },
   body: file
  });
  if (!response.ok) throw Error('Das Bild konnte nicht hochgeladen werden.');
  return path;
 }
 async function imageURL(path) {
  if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(path))throw Error('Ungültiger Bildpfad.');
  const previous = signedImages.get(path);
  if (previous && previous.until > Date.now()) return previous.url;
  const data = await api('/storage/v1/object/sign/clan-images/' + path, 'POST', { expiresIn: 3600 });
  const url = context.url + '/storage/v1' + (data.signedURL || data.signedUrl);
  signedImages.set(path, { url, until: Date.now() + 3300000 });
  return url;
 }
 async function refreshReceipts(messages) {
  const ids = messages.map(r => r.id);
  if (!ids.length) return;
  const data = await api('/rest/v1/message_receipts?record_id=in.(' + ids.join(',') + ')&select=record_id,user_id,read_at');
  receipts.clear();
  for (const entry of data) {
   const list = receipts.get(entry.record_id) || [];
   list.push(entry);
   receipts.set(entry.record_id, list);
  }
 }
 async function markRead(messages) {
  const unread = messages.filter(r => !own(r) && !(receipts.get(r.id) || []).some(x => x.user_id === context.me.id));
  if (!unread.length || document.visibilityState !== 'visible') return;
  await api('/rest/v1/message_receipts?on_conflict=record_id,user_id', 'POST', unread.map(r => ({ record_id: r.id, user_id: context.me.id })), 'resolution=ignore-duplicates');
 }
 function chatPage(name, container) {
  const generation=renderGeneration;
  const privateChat = name === 'Private Nachrichten';
  const otherMembers = context.members.filter(p => p.active && p.id !== context.me.id);
  if (!otherMembers.some(p => p.id === selected.recipient)) selected.recipient = otherMembers[0]?.id || '';
  container.innerHTML = `${privateChat ? `<label>Empfänger<select id="recipient">${otherMembers.map(p => `<option value="${p.id}" ${p.id === selected.recipient ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>` : ''}
   <div class="panel chatlog" id="chatlog" aria-live="polite"></div>
   <form id="messageform"><label>Nachricht<textarea name="message" maxlength="8000" rows="3"></textarea></label><label>Bild anhängen · bis 1 MB<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label><button class="primary">Senden</button></form><small>Nachrichten und Lesebestätigungen werden automatisch aktualisiert.</small>`;
  let signature = '';
  async function draw() {
   if (!container.isConnected || !$('#chatlog')) return;
   const messages = visibleRecords().filter(r => r.kind === (privateChat ? 'message' : 'chat') && (!privateChat || (own(r) && r.recipient_id === selected.recipient) || (r.owner_id === selected.recipient && r.recipient_id === context.me.id))).slice(0, 100).reverse();
   await refreshReceipts(messages);
   await markRead(messages);
   const nextSignature = JSON.stringify(messages.map(r => [r.id, r.updated_at, receipts.get(r.id)]));
   if(generation!==renderGeneration)return;
   if (nextSignature === signature || !$('#chatlog')) return;
   signature = nextSignature;
   const log = $('#chatlog');
   const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
   log.innerHTML = messages.map(r => `<div class="message"><strong>${esc(memberName(r.owner_id))}</strong> <small>${new Date(r.created_at).toLocaleString('de-DE')}</small><p>${esc(r.data.message || r.title)}</p>${r.data.image_path ? `<button class="image-message" data-path="${esc(r.data.image_path)}"><img alt="Bild von ${esc(memberName(r.owner_id))}" loading="lazy"></button>` : ''}${own(r) ? `<small>${(receipts.get(r.id) || []).length ? 'Gelesen von ' + (receipts.get(r.id) || []).map(x => esc(memberName(x.user_id))).join(', ') : 'Gesendet'}</small>` : ''}</div>`).join('') || '<p>Schreibe die erste Nachricht.</p>';
   for (const button of log.querySelectorAll('[data-path]')) {
    const src = await imageURL(button.dataset.path);
    if (!button.isConnected) continue;
    button.querySelector('img').src = src;
    button.onclick = () => showImage(src);
   }
   if (atBottom) log.scrollTop = log.scrollHeight;
  }
  if (privateChat) $('#recipient').onchange = () => { selected.recipient = $('#recipient').value; signature = ''; guarded(draw); };
  const form = $('#messageform');
  form.onsubmit = event => {
   event.preventDefault();
   guarded(async () => {
    const button = form.querySelector('button.primary');
    button.disabled = true;
    let path = null;
    try {
     const message = form.elements.message.value.trim();
     const file = form.elements.image.files[0];
     if (!message && !file) throw Error('Bitte eine Nachricht oder ein Bild auswählen.');
     if (privateChat && !selected.recipient) throw Error('Ein weiteres Mitglied ist erforderlich.');
     path = await uploadImage(file);
     await saveRecord(privateChat ? 'message' : 'chat', message.slice(0, 100) || 'Bildnachricht', { message, ...(path ? { image_path: path } : {}) }, null, privateChat ? selected.recipient : null);
     form.reset();
     signature = '';
     await draw();
    } catch (error) {
     if(path){const attached=await api('/rest/v1/clan_records?data->>image_path=eq.'+encodeURIComponent(path)+'&select=id').catch(()=>null);if(attached&&attached.length===0)await api('/storage/v1/object/clan-images','DELETE',{prefixes:[path]}).catch(()=>{});}
     throw error;
    } finally {
     button.disabled = false;
    }
   });
  };
  refreshChat = draw;
  guarded(draw);
 }
 async function poll() {
  if (!context.me || polling || document.visibilityState !== 'visible') return;
  polling = true;
  try {
   await context.reload();
   await refreshChat?.();
   refreshNotifications?.();
  } catch (error) {
   console.warn('Aktualisierung fehlgeschlagen', error.message);
  } finally {
   polling = false;
  }
 }
 setInterval(poll, 15000);
 document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
 function backupPage(container) {
  container.innerHTML = `<div class="panel"><h2>Clandaten sichern</h2><p>Exportiert gemeinsame Claneinträge und deine privaten Nachrichten. Bilder werden gemeinsam mit der Sicherung gespeichert.</p><button id="backup-export">Sicherung herunterladen</button></div><div class="panel"><h2>Sicherung wiederherstellen</h2><p>Die Clan-Leitung kann gemeinsame Einträge für ihre ursprünglichen Eigentümer wiederherstellen. Bestehende IDs werden übersprungen. Private Nachrichten können ihre jeweiligen Eigentümer importieren.</p><input id="backup-file" type="file" accept="application/json"><button id="backup-import">Sicherung prüfen und importieren</button></div>`;
  $('#backup-export').onclick = () => guarded(async () => {
   const button = $('#backup-export');
   button.disabled = true;
   try {
    await loadRecords();
    const images = {};
    for (const record of visibleRecords()) {
     const path = record.data.image_path;
     if (!path || images[path]) continue;
     const response = await fetch(await imageURL(path));
     if (!response.ok) throw Error('Ein Bild konnte nicht gesichert werden. Bitte erneut versuchen.');
     const blob = await response.blob();
     images[path] = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
     });
    }
    const payload = { version: 2, exported_at: new Date().toISOString(), profiles: context.members, records: visibleRecords(), images };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sick-clan-sicherung-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
   } finally { button.disabled = false; }
  });
  $('#backup-import').onclick = () => guarded(async () => {
   const file = $('#backup-file').files[0];
   if (!file || file.size > 25000000) throw Error('Bitte eine Sicherung bis 25 MB auswählen.');
   const payload = JSON.parse(await file.text());
   if (![1, 2].includes(payload.version) || !Array.isArray(payload.records)) throw Error('Ungültiges Sicherungsformat.');
   const button = $('#backup-import');
   button.disabled = true;
   try {
    const prepared = [];
    for (const original of payload.records) {
     const record = structuredClone(original);
     if (record.data?.image_path && payload.images?.[record.data.image_path] && !visibleRecords().some(r => r.id === record.id)) {
      if(record.owner_id!==context.me.id&&(['message','notification'].includes(record.kind)||!['Leitung','Stellvertreter'].includes(context.me.role))){prepared.push(record);continue;}
      const response = await fetch(payload.images[record.data.image_path]);
      const blob = await response.blob();
      record.data.image_path = await uploadImage(new File([blob], 'sicherung', { type: blob.type }));
     }
     prepared.push(record);
    }
    const result = await api('/rest/v1/rpc/restore_clan_records', 'POST', { payload: prepared });
    await loadRecords();
    context.status(`${result.restored} Einträge wiederhergestellt, ${result.skipped} bestehende oder nicht zugängliche Einträge übersprungen.`);
   } finally { button.disabled = false; }
  });
 }
 function researchPage(name, container) {
  const categories = [...new Set(context.research.map(r => r.categoryId))];
  container.innerHTML = `<div class="panel"><h2>Forschungsbaum</h2><p>Verbindungen zeigen die tatsächlichen Voraussetzungen aus den Spieldaten. Wähle eine Kategorie und markiere deinen Fortschritt.</p><div class="toolbar"><select id="research-category" aria-label="Forschungskategorie">${categories.map(id => `<option value="${esc(id)}">${esc(context.research.find(r => r.categoryId === id).category)}</option>`).join('')}</select><input id="research-search" type="search" placeholder="Freischaltung suchen" aria-label="Forschung suchen"></div></div><div class="research-viewport"><div id="research-graph" class="research-graph"></div></div>`;
  function draw() {
   const category = $('#research-category').value;
   const allNodes = context.research.filter(r => r.categoryId === category);
   const byId = new Map(context.research.map(r => [r.id, r]));
   const depths = new Map();
   function depth(node, trail = new Set()) {
    if (depths.has(node.id)) return depths.get(node.id);
    if (trail.has(node.id)) return 0;
    const nextTrail = new Set(trail).add(node.id);
    const parents = (node.requires || []).map(id => byId.get(id)).filter(p => p && p.categoryId === category);
    const value = parents.length ? 1 + Math.max(...parents.map(p => depth(p, nextTrail))) : 0;
    depths.set(node.id, value);
    return value;
   }
   const stages = new Map();
   for (const node of allNodes) {
    const stage = depth(node);
    if (!stages.has(stage)) stages.set(stage, []);
    stages.get(stage).push(node);
   }
   const query = $('#research-search').value.toLowerCase();
   const graph = $('#research-graph');
   graph.innerHTML = '<svg class="research-links" aria-hidden="true"></svg>' + [...stages].sort(([a], [b]) => a - b).map(([stage, nodes]) => `<section class="research-stage" data-stage="${stage}">${nodes.map(node => {
    const completed = visibleRecords().filter(r => r.kind === 'research' && r.data.node === String(node.index) && r.data.complete);
    const checked = completed.some(own);
    const item = context.catalog.find(item => item.id === node.id);
    return `<div class="panel research-node ${checked ? 'complete' : ''} ${query && !(node.name + ' ' + (node.nameOriginal || '')).toLowerCase().includes(query) ? 'dimmed' : ''}" data-node-id="${esc(node.id)}">${icon(item)}<h2>${esc(node.name)}</h2><small>Stufe ${esc(node.requiredTier)}</small><p>${money(node.itemCost)}${node.imprisonmentYears ? ' · ' + node.imprisonmentYears + ' Haftjahre' : ''}</p><p class="prerequisites">${node.requires?.length ? 'Voraussetzungen · ' + node.requires.map(id => esc(byId.get(id)?.name || id)).join(', ') : 'Einstieg in diesen Forschungszweig'}</p>${name === 'Gemeinsame Forschung' ? `<p>${completed.length ? completed.map(r => esc(memberName(r.owner_id))).join(', ') : 'Noch kein Mitglied'}</p>` : `<label><input type="checkbox" data-research="${node.index}" ${checked ? 'checked' : ''}>Erforscht</label>`}</div>`;
   }).join('')}</section>`).join('');
   graph.querySelectorAll('[data-research]').forEach(box => box.onchange = () => guarded(async () => {
    box.disabled = true;
    try {
     const node = context.research.find(r => String(r.index) === box.dataset.research);
     const old = visibleRecords().find(r => own(r) && r.kind === 'research' && r.data.node === box.dataset.research);
     await saveRecord('research', node.name, { node: box.dataset.research, complete: box.checked }, old?.id);
     draw();
    } finally { if (box.isConnected) box.disabled = false; }
   }));
   observer?.disconnect();
   observer = new ResizeObserver(drawLinks);
   observer.observe(graph);
   requestAnimationFrame(drawLinks);
   function drawLinks() {
    if (!graph.isConnected) return;
    const svg = graph.querySelector('svg');
    svg.setAttribute('width', graph.scrollWidth);
    svg.setAttribute('height', graph.scrollHeight);
    svg.replaceChildren();
    const rect = graph.getBoundingClientRect();
    const elements = new Map([...graph.querySelectorAll('[data-node-id]')].map(e => [e.dataset.nodeId, e]));
    for (const node of allNodes) {
     for (const parent of node.requires || []) {
      if (!elements.has(parent)) continue;
      const from = elements.get(parent).getBoundingClientRect();
      const to = elements.get(node.id).getBoundingClientRect();
      const x1 = from.left + from.width / 2 - rect.left;
      const y1 = from.bottom - rect.top;
      const x2 = to.left + to.width / 2 - rect.left;
      const y2 = to.top - rect.top;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`);
      svg.append(path);
     }
    }
   }
  }
  $('#research-category').onchange = draw;
  $('#research-search').oninput = draw;
  draw();
 }
 async function mapPage(container) {
  const generation=renderGeneration;
  container.innerHTML='<div class="panel" role="status">Karte wird geladen …</div>';
  const bundle=await locations.load();
  const {world,city,robberyKeys}=bundle;
  if (!container.isConnected || generation!==renderGeneration || context.currentPage!=='Stadtkarte') return;
  container.innerHTML = `<div class="panel"><div class="toolbar"><select id="map-view" aria-label="Kartenansicht"><option value="city">Looty Bay · Stadtplan</option><option value="world">Weltkarte · Original-Spielbild</option></select><input id="map-search" type="search" placeholder="Ort, Fund oder Schlüssel suchen" aria-label="Karte durchsuchen"><select id="map-type" aria-label="Ortsart"><option value="building">Gebäude</option><option value="all">Alle Orte</option><option value="poi">Fundorte und Dienste</option></select></div><p id="map-description"></p></div><div class="map-tools"><button id="map-plus" aria-label="Karte vergrößern">+</button><button id="map-minus" aria-label="Karte verkleinern">−</button><button id="map-home">Gesamtansicht</button></div><div class="map-layout"><div id="map-viewport" class="interactive-map" tabindex="0" aria-label="Interaktive Karte. Ziehen zum Verschieben, Mausrad zum Zoomen."><div id="map-canvas" class="map-canvas"></div></div><div id="map-info" class="panel map-detail"></div></div><div id="map-results" class="map-results"></div><p class="muted" id="map-source"></p>`;
  const viewport = $('#map-viewport');
  const canvas = $('#map-canvas');
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let width = 1200;
  let height = 900;
  let points = [];
  let drag = null;
  let targetToCenter=null;
  const buildings = city.buildings.map(p => ({ ...p, key: 'building-' + p.id, type: 'building' }));
  const cityPoints = [...buildings, ...city.pois.map(p => ({ ...p, key: 'poi-' + p.id, type: 'poi' }))];
  function location(point) {
   if ($('#map-view').value === 'world') return [point.x, point.y];
   const bounds = city.bounds;
   return [20 + (point.x - bounds.minX) / (bounds.maxX - bounds.minX) * (city.width - 40), 20 + (bounds.maxZ - point.z) / (bounds.maxZ - bounds.minZ) * (city.height - 40)];
  }
  function transform() { canvas.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`; }
  function home() {
   scale = Math.min(viewport.clientWidth / width, viewport.clientHeight / height);
   panX = (viewport.clientWidth - width * scale) / 2;
   panY = (viewport.clientHeight - height * scale) / 2;
   transform();
  }
  function zoom(factor, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
   const next = Math.min(5, Math.max(.15, scale * factor));
   panX = x - (x - panX) * next / scale;
   panY = y - (y - panY) * next / scale;
   scale = next;
   transform();
  }
  function show(point, center = false) {
   const [x, y] = location(point);
   for(const marker of canvas.querySelectorAll('[data-map-id]'))marker.classList.toggle('is-selected',marker.dataset.mapId===point.key);
   if (center) { scale = Math.max(scale, 1); panX = viewport.clientWidth / 2 - x * scale; panY = viewport.clientHeight / 2 - y * scale; transform(); }
   $('#map-info').innerHTML=point.z!==undefined?locations.detail(point,bundle):`<h2>${esc(point.name)}</h2><p>Distrikt auf der offiziellen Weltkarte. Wechsle zu Looty Bay für Gebäude, Schlüssel und Beute.</p>`;
   if(window.innerWidth<=800)$('#map-info').scrollIntoView({behavior:'auto',block:'nearest'});
  }

  function draw(reset = false) {
   const isWorld = $('#map-view').value === 'world';
   width = isWorld ? world.width : city.width;
   height = isWorld ? world.height : city.height;
   canvas.style.width = width + 'px';
   canvas.style.height = height + 'px';
   canvas.classList.remove('coordinate-grid');
   const query = $('#map-search').value.toLowerCase();
   points = (isWorld ? world.points.map(p => ({ ...p, key: p.id })) : cityPoints).filter(p => {
    const kind = $('#map-type').value;
    const associated = [...(p.lootIds || []), ...(p.keyIds || [])].map(id => robberyKeys.find(item => item.id === id)?.name || context.catalog.find(item => item.id === id)?.name || '').join(' ');
    return (isWorld || kind === 'all' || p.type === kind) && (p.name + ' ' + (p.nameOriginal || '') + ' ' + associated).toLowerCase().includes(query);
   });
   canvas.innerHTML = (isWorld ? `<img class="original-map" src="${world.image}" alt="Offizielle ROB-RUN-Weltkarte">` : `<img class="original-map" src="${esc(city.image)}" alt="Looty-Bay-Stadtplan mit Straßen, Küsten und Gebäuden"><div class="district-labels">${city.districts.map(p => { const [x,y] = location(p); return `<span style="left:${x}px;top:${y}px">${esc(p.name)}</span>`; }).join('')}</div>`) + points.map(p => { const [x,y] = location(p); return `<button class="map-marker ${p.type || 'district'}" style="left:${x}px;top:${y}px" data-map-id="${esc(p.key)}" aria-label="${esc(p.name)}" title="${esc(p.name)}">${p.type === 'poi' ? '•' : p.name.slice(0,1)}</button>`; }).join('');
   $('#map-description').textContent = isWorld ? 'Originale Weltkarte von Kefir. Distrikte anklicken oder suchen, mit Mausrad und Schaltflächen zoomen und die Karte ziehen.' : 'Looty Bay mit Küsten, Straßen und Gebäuden aus den veröffentlichten Spielgeometrien. 29 Gebäude und 144 Fundorte oder Dienste sind an ihren tatsächlichen Positionen markiert. Anklicken, ziehen oder zoomen; über die Ortsart lassen sich Gebäude und Fundorte filtern.';
   $('#map-source').innerHTML=esc(isWorld?world.attribution:city.attribution)+' · <a target="_blank" rel="noopener" href="'+esc(isWorld?world.sourcePage:city.sourcePage)+'">Quelle öffnen</a>';
   $('#map-results').innerHTML = points.map(p => `<button data-map-id="${esc(p.key)}">${esc(p.name)}</button>`).join('') || '<p>Keine passenden Orte gefunden.</p>';
   for (const button of container.querySelectorAll('[data-map-id]')) button.onclick = () => show(points.find(p => p.key === button.dataset.mapId), button.closest('#map-results') !== null);
   if (reset) { home(); $('#map-info').innerHTML = '<div class="map-empty"><span class="eyebrow">DEIN NÄCHSTES ZIEL</span><h2>Ort auswählen</h2><p>Klicke direkt auf einen Kartenpunkt. Hier erscheinen Schlüssel, Werkzeuge, Sicherheit und mögliche Beute.</p></div>'; }
  }
  $('#map-view').onchange = () => {targetToCenter=null;draw(true);};
  $('#map-type').onchange = () => draw();
  $('#map-search').oninput = () => draw();
  $('#map-plus').onclick = () => zoom(1.35);
  $('#map-minus').onclick = () => zoom(1 / 1.35);
  $('#map-home').onclick=()=>{targetToCenter=null;home();};
  viewport.onwheel = event => { event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - rect.left, event.clientY - rect.top); };
  viewport.onpointerdown = event => { if (event.target.closest('button')) return; drag = { x: event.clientX, y: event.clientY, panX, panY }; viewport.setPointerCapture(event.pointerId); };
  viewport.onpointermove = event => { if (!drag) return; panX = drag.panX + event.clientX - drag.x; panY = drag.panY + event.clientY - drag.y; transform(); };
  viewport.onpointerup = viewport.onpointercancel = () => { drag = null; };
  viewport.onkeydown = event => { const offsets = { ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40] }; if (!offsets[event.key]) return; event.preventDefault(); panX += offsets[event.key][0]; panY += offsets[event.key][1]; transform(); };
  observer = new ResizeObserver(()=>{home();if(targetToCenter)show(targetToCenter,true);});
  observer.observe(viewport);
  draw(true);
  if(pendingMapTarget){const target=cityPoints.find(point=>point.id===pendingMapTarget);pendingMapTarget=null;if(target){targetToCenter=target;$('#map-view').value='city';draw(true);requestAnimationFrame(()=>show(target,true));}}
  const image=canvas.querySelector('.original-map');if(image)image.onerror=()=>{$('#map-description').textContent='Das Kartenbild konnte nicht geladen werden. Bitte die Seite aktualisieren oder die andere Kartenansicht auswählen.';};
  if(!targetToCenter)requestAnimationFrame(home);
 }
 async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('./');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api('/rest/v1/push_subscriptions?endpoint=eq.' + encodeURIComponent(subscription.endpoint), 'DELETE');
  await subscription.unsubscribe();
 }
 function notificationsPage(container) {
  container.innerHTML = `<div class="panel"><h2>Benachrichtigungen auf diesem Gerät</h2><p>Pushmeldungen informieren dich auch bei geschlossener Seite über neue Nachrichten und anstehende Termine. Die Freigabe gilt für diesen Browser. Auf dem iPhone muss die Seite dafür zum Home-Bildschirm hinzugefügt werden.</p><div class="actions"><button id="enable-push">Push aktivieren</button><button id="disable-push">Push deaktivieren</button></div><p id="push-state" role="status"></p></div><div id="notifications-list" class="grid"></div>`;
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  $('#enable-push').disabled = !supported;
  $('#disable-push').disabled = !supported;
  async function showState() {
   if (!$('#push-state')) return;
   if (!supported) { $('#push-state').textContent = 'Dieser Browser unterstützt Web Push hier nicht.'; return; }
   const registration = await navigator.serviceWorker.getRegistration('./');
   const subscription = await registration?.pushManager.getSubscription();
   if ($('#push-state')) $('#push-state').textContent = subscription ? 'Push ist auf diesem Gerät aktiviert.' : 'Push ist auf diesem Gerät deaktiviert.';
  }
  $('#enable-push').onclick = () => guarded(async () => {
   const permission = await Notification.requestPermission();
   if (permission !== 'granted') throw Error('Benachrichtigungen wurden vom Browser nicht freigegeben.');
   const registration = await navigator.serviceWorker.register('./sw.js');
   await navigator.serviceWorker.ready;
   const configuration = await api('/functions/v1/clan-push', 'POST', { action: 'public-key' });
   const text = configuration.publicKey.replace(/-/g, '+').replace(/_/g, '/');
   const binary = atob(text.padEnd(Math.ceil(text.length / 4) * 4, '='));
   const applicationServerKey = Uint8Array.from(binary, character => character.charCodeAt(0));
   const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
   await api('/functions/v1/clan-push', 'POST', { action: 'subscribe', subscription: subscription.toJSON() });
   await showState();
  });
  $('#disable-push').onclick = () => guarded(async () => { await disablePush(); await showState(); });
  function draw() {
   const records = visibleRecords().filter(record => record.kind === 'notification' || (record.data.assignee === context.me.id && !['Erledigt','Zurückgegeben','Abgeschlossen'].includes(record.data.state)) || (record.kind === 'timer' && own(record)));
   $('#notifications-list').innerHTML = records.map(record => `<div class="panel"><h2>${esc(record.title)}</h2><p>${esc(record.data.note || record.data.state || '')}</p>${record.data.due ? `<small>Termin · ${new Date(record.data.due).toLocaleString('de-DE')}</small>` : ''}</div>`).join('') || '<div class="panel"><p>Du hast aktuell keine offenen Benachrichtigungen.</p></div>';
  }
  refreshNotifications = draw;
  draw();
  guarded(showState);
 }
 function farmPage(container) {
  const saved = visibleRecords().find(record => record.kind === 'plant' && own(record));
  const previous = saved?.data || {};
  const tables = structuredClone(previous.tables || [{green:previous.green ?? context.me.plant_counts?.[0] ?? 0,purple:previous.purple ?? context.me.plant_counts?.[1] ?? 0,gold:previous.gold ?? context.me.plant_counts?.[2] ?? 0,fan:previous.fan || false,pump:previous.pump || false,uv:previous.uv || false,measured:0}]);
  container.innerHTML = `<div class="panel"><div class="farm-visuals">${['cargo_bush_growing_1','cargo_bush_mature_1','bush_drugs_1'].map(id => {const item=context.catalog.find(item=>item.id===id);return `<div>${icon(item)}<small>${esc(item?.name || '')}</small></div>`;}).join('')}</div><h2>Deine Plantage</h2><p>Erfasse die Pflanzen und Ausrüstung pro Anbautisch oder Pflanzengruppe.</p><div class="formgrid"><label>Beutel je Pflanze<select id="farm-bags">${[2,3,4].map(value=>`<option value="${value}" ${Number(previous.bags || 3)===value?'selected':''}>${value}${value===3?' · Durchschnitt':''}</option>`).join('')}</select></label><label>Käuferstufe<select id="farm-buyer">${[1,2,3,4,5].map(value=>`<option value="${value}" ${Number(previous.buyer || 1)===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Ernteintervall Minuten · 0 = sofort<input id="farm-interval" type="number" min="0" value="${Number(previous.interval)||0}"></label></div></div><form id="farm-form"><div id="farm-tables"></div><div class="actions"><button type="button" id="farm-add">Anbautisch hinzufügen</button><button class="primary">Plantage speichern</button></div></form><div class="panel grid" id="farm-result"></div><details class="panel"><summary>Spielwerte und Berechnung</summary><p>Beutelpreise auf Käuferstufe 1 · Grün 4.000 $, Lila 6.000 $, Gold 8.000 $. Pro Ernte entstehen 2–4 Beutel. Verkäuferstufen verwenden die Multiplikatoren 1, 1,1, 1,2, 1,35 und 1,5.</p><p>Die Communitymessung beschreibt 60 Minuten Grundzeit, geteilt durch 1 plus Ausrüstungsboni. Mit allen drei Upgrades ergibt das 40 Minuten. Eine unbestätigte Interpretation des Spielcodes ergibt 30 Minuten. Ein eigener Messwert pro Tisch ersetzt die Communityformel.</p><a href="https://robrunwiki.com/en/tools/farm/" target="_blank" rel="noopener">Messwerte und Preise · ROB RUN Wiki</a></details>`;
  function drawTables() {
   $('#farm-tables').innerHTML=tables.map((table,index)=>`<fieldset class="panel farm-table" data-table="${index}"><legend>Anbautisch ${index+1}</legend><div class="formgrid">${[['green','Grüne Pflanzen'],['purple','Lila Pflanzen'],['gold','Goldene Pflanzen']].map(([key,label])=>`<label>${label}<input data-key="${key}" type="number" min="0" step="1" required value="${Number(table[key])||0}"></label>`).join('')}<label>Eigene gemessene Zykluszeit · Minuten, optional<input data-key="measured" type="number" min="0" step="any" value="${Number(table.measured)||0}"></label></div><div class="farm-upgrades">${[['fan','Ventilator · +12 %','builder_cargo_charge_workbench_fan_slot'],['pump','Wasserpumpe · +14 %','builder_cargo_charge_workbench_water_pump_slot'],['uv','UV-Lampe · +24 %','builder_cargo_charge_workbench_glow_lamp_slot']].map(([key,label,id])=>`<label>${icon(context.catalog.find(item=>item.id===id))}<span><input data-key="${key}" type="checkbox" ${table[key]?'checked':''}>${label}</span></label>`).join('')}</div><p data-table-result></p><button type="button" data-remove="${index}">Tisch entfernen</button></fieldset>`).join('');
   container.querySelectorAll('[data-table] input').forEach(input=>input.oninput=()=>{
    const table=tables[Number(input.closest('[data-table]').dataset.table)];
    table[input.dataset.key]=input.type==='checkbox'?input.checked:Number(input.value);
    calculate();
   });
   container.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>{tables.splice(Number(button.dataset.remove),1);drawTables();calculate();});
  }
  function calculate() {
   const bags=Number($('#farm-bags').value),buyer=Number($('#farm-buyer').value),interval=Math.max(0,Number($('#farm-interval').value));
   const multiplier=[1,1.1,1.2,1.35,1.5][buyer-1];
   let hourly=0,perRound=0,plants=0;
   tables.forEach((table,index)=>{
    const natural=Number(table.measured)>0?Number(table.measured):60/(1+(table.fan?.12:0)+(table.pump?.14:0)+(table.uv?.24:0));
    const effective=interval>0?Math.ceil(natural/interval)*interval:natural;
    const round=(table.green*4000+table.purple*6000+table.gold*8000)*bags*multiplier;
    hourly+=round*60/effective;perRound+=round;plants+=table.green+table.purple+table.gold;
    const result=container.querySelector(`[data-table="${index}"] [data-table-result]`);
    if(result)result.textContent=`Zyklus ${natural.toLocaleString('de-DE',{maximumFractionDigits:2})} min · Ernteintervall ${effective.toLocaleString('de-DE',{maximumFractionDigits:2})} min · ${money(round*60/effective)} pro Stunde`;
   });
   $('#farm-result').innerHTML=[[plants,'Pflanzen'],[money(perRound),'Umsatz einer gemeinsamen Ernte'],[money(hourly),'Umsatz pro Stunde'],[money(hourly*24),'Umsatz pro 24 Stunden']].map(([value,label])=>`<div class="stat"><small>${label}</small><strong>${value}</strong></div>`).join('');
  }
  $('#farm-add').onclick=()=>{tables.push({green:0,purple:0,gold:0,fan:false,pump:false,uv:false,measured:0});drawTables();calculate();};
  for(const id of ['farm-bags','farm-buyer','farm-interval'])$(id).oninput=calculate;
  $('#farm-form').onsubmit=event=>{event.preventDefault();guarded(async()=>{
   const button=$('#farm-form .primary');button.disabled=true;
   try{
    if(tables.some(table=>['green','purple','gold'].some(key=>!Number.isInteger(table[key])||table[key]<0)||!Number.isFinite(table.measured)||table.measured<0))throw Error('Bitte Pflanzenanzahl und Messzeiten prüfen.');
    const data={tables,bags:Number($('#farm-bags').value),buyer:Number($('#farm-buyer').value),interval:Number($('#farm-interval').value)};
    await saveRecord('plant','Meine Plantage',data,saved?.id);
    await api('/rest/v1/profiles?id=eq.'+context.me.id,'PATCH',{plantation:tables.length>0,plant_counts:['green','purple','gold'].map(key=>tables.reduce((sum,table)=>sum+table[key],0))});
    context.status('Plantage gespeichert.');
   }finally{button.disabled=false;}
  });};
  drawTables();calculate();
 }
 async function keysPage(container){
  const generation=renderGeneration;
  container.innerHTML='<div class="panel" role="status">Raubschlüssel werden geladen …</div>';
  const response=await fetch('data/robbery-keys.json?v=0.5',{cache:'no-cache'});
  if(!response.ok)throw Error('Die Schlüsselübersicht konnte nicht geladen werden.');
  const keys=await response.json();
  if(generation!==renderGeneration)return;
  container.innerHTML='<div class="panel"><h2>Schlüssel zum Ausrauben</h2><p>Tür- und Tresorschlüssel sowie Zugangskarten mit belegter Gebäudezuordnung.</p><input id="key-search" type="search" aria-label="Schlüssel oder Ort suchen" placeholder="Schlüssel, Gebäude oder Stadtteil"></div><div id="key-list" class="grid"></div>';
  function draw(){
   const query=$('#key-search').value.toLowerCase();
   $('#key-list').innerHTML=keys.filter(key=>(key.name+' '+key.locations.map(p=>p.name+' '+p.district).join(' ')).toLowerCase().includes(query)).map(key=>{
    const generic=context.catalog.find(item=>item.id===(key.kind==='safe_key'?'safe_key_1':key.kind==='room_key'?'room_key_1':'vip_key_1'));
    return `<div class="panel card">${icon(generic)}<small>Schlüsseltyp</small><h2>${esc(key.name)}</h2><p>${esc(key.description)}</p>${key.locations.map(place=>`<p><strong>${esc(place.name)}</strong><br>Spielkoordinaten · X ${place.x} · Z ${place.z}</p><button data-key-place="${esc(place.id)}">Ort auf der Karte zeigen</button>`).join('')}<p><a href="${esc(key.source)}" target="_blank" rel="noopener">Zuordnung aus den Spieldaten</a></p></div>`;
   }).join('')||'<div class="panel">Keine passenden Schlüssel gefunden.</div>';
   container.querySelectorAll('[data-key-place]').forEach(button=>button.onclick=()=>{pendingMapTarget=button.dataset.keyPlace;context.go('Stadtkarte');});
  }
  $('#key-search').oninput=draw;draw();
 }
 async function locationsPage(container){const generation=renderGeneration;return locations.page(container,()=>generation===renderGeneration&&container.isConnected);}
 return { cleanup, locationsPage, chatPage, backupPage, researchPage, mapPage, keysPage, notificationsPage, disablePush, farmPage, icon };
}
