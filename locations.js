export function createLocations(context){
 const {esc,money}=context;
 let bundle;
 async function load(){
  if(!bundle)bundle=Promise.all(['map-world','map-city','robbery-keys','location-details'].map(async name=>{
   const response=await fetch('data/'+name+'.json?v=0.5',{cache:'no-cache'});
   if(!response.ok)throw Error('Ortsdaten konnten nicht geladen werden. Bitte aktualisieren.');
   return response.json();
  })).then(([world,city,robberyKeys,details])=>({world,city,robberyKeys,details})).catch(error=>{bundle=null;throw error;});
  return bundle;
 }
 function detail(point,{city,robberyKeys,details}){
  const data=details[point.id],keys=(point.keyIds||[]).map(id=>robberyKeys.find(key=>key.id===id)).filter(Boolean);
  const loot=(point.lootIds||[]).map(id=>context.catalog.find(item=>item.id===id)).filter(Boolean);
  const list=entries=>'<ul class="location-facts">'+entries.map(item=>`<li><span>${esc(item.label)}</span><b>${item.count}</b></li>`).join('')+'</ul>';
  const security=['alarm','camera','detector','hack','vault','door'].flatMap(group=>data?.summary[group]||[]);
  const spots=['loot','container','obj','cargo','box','holding','atm','service'].flatMap(group=>data?.summary[group]||[]);
  return `<div class="location-title"><span class="eyebrow">${esc(point.categoryName||'Ort in Looty Bay')}</span><h2>${esc(point.name)}</h2><small>Spielkoordinaten · X ${point.x} · Z ${point.z}</small></div>${data?.floors.length?'<p class="floor-label">Erfasste Ebenen · '+data.floors.map(f=>f<0?'Keller':f===0?'Erdgeschoss':f+'. Obergeschoss').join(', ')+'</p>':''}<section class="location-section"><h3>Zugang & Schlüssel</h3><p class="muted">Für die jeweils genannten verschlossenen Bereiche.</p>${keys.length?keys.map(key=>`<div class="key-requirement"><strong>${esc(key.name)}</strong><p>${esc(key.description)}</p></div>`).join(''):'<p>Keine ortsspezifische Schlüsselzuordnung in der Quelle. Daraus folgt keine Garantie für freien Zugang.</p>'}</section><section class="location-section"><h3>Belegte Werkzeuge</h3>${data?.tools.length?data.tools.map(tool=>`<div class="key-requirement"><strong>${esc(context.catalog.find(item=>item.id===tool.id)?.name||tool.id)}</strong><p>${esc(tool.purpose)}</p></div>`).join(''):'<p>Für diesen Ort ist kein bestimmtes Werkzeug eindeutig belegt.</p>'}</section>${security.length?'<section class="location-section"><h3>Sicherheit & Hindernisse</h3>'+list(security)+'</section>':''}<section class="location-section"><h3>Mögliche Beute</h3>${loot.length?'<div class="loot-strip">'+loot.map(item=>`<div>${context.icon(item)}<span>${esc(item.name)}</span>${item.price!=null?'<small>'+money(item.price)+' · Katalogwert</small>':''}</div>`).join('')+'</div>':''}${spots.length?'<h4>Erfasste Fundstellen & Behälter</h4>'+list(spots):!loot.length?'<p>Keine gesicherte Beuteliste für diesen Punkt vorhanden.</p>':''}<p class="muted">Fundstellen sind keine garantierte Ausbeute pro Run. Verfügbarkeit und Inhalt können abweichen.</p></section><a href="${esc(data?.source||city.source)}" target="_blank" rel="noopener">Ortsdaten und Quelle</a>`;
 }
 async function page(container,isCurrent){
  container.innerHTML='<div class="panel" role="status">Locations werden geladen …</div>';
  const data=await load();if(!isCurrent())return;
  container.innerHTML='<div class="toolbar"><input id="location-search" type="search" aria-label="Locations durchsuchen" placeholder="Gebäude, Schlüssel oder Beute suchen"></div><div id="locations-grid" class="grid"></div><section id="location-detail" class="panel" hidden></section>';
  const $=selector=>container.querySelector(selector);
  function draw(){
   const q=$('#location-search').value.toLowerCase();
   const buildings=data.city.buildings.filter(point=>{
    const names=[point.name,point.categoryName,...(point.lootIds||[]).map(id=>context.catalog.find(item=>item.id===id)?.name||''),...(point.keyIds||[]).map(id=>data.robberyKeys.find(key=>key.id===id)?.name||'')];
    return names.join(' ').toLowerCase().includes(q);
   });
   $('#locations-grid').innerHTML=buildings.map(point=>`<button class="panel location-card" data-location="${esc(point.id)}"><span class="eyebrow">${esc(point.categoryName)}</span><h2>${esc(point.name)}</h2><p>${point.keyIds.length} Schlüsselzuordnungen · ${point.lootIds.length} Beutebeispiele</p><small>X ${point.x} · Z ${point.z}</small><strong>Ort ansehen</strong></button>`).join('')||'<p>Keine passende Location gefunden.</p>';
   container.querySelectorAll('[data-location]').forEach(button=>button.onclick=()=>{
    const point=data.city.buildings.find(p=>p.id===button.dataset.location),panel=$('#location-detail');
    panel.hidden=false;panel.innerHTML=detail(point,data)+`<button id="location-map" class="primary">Auf Stadtkarte zeigen</button>`;
    $('#location-map').onclick=()=>context.showOnMap(point.id);
    panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   });
  }
  $('#location-search').oninput=draw;draw();
 }
 return {load,detail,page};
}
