import { createFeatures } from './features.js?v=0.5';
const URL='https://piklnvlswdwxpmnpliwn.supabase.co';
const KEY='sb_publishable_8fA_DM-Yw5qWqzXNQn-YLA_MWtxpoS6';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:2})+' $';
const date=v=>v?new Date(v).toLocaleString('de-DE'):'—';
let session=null,me=null,members=[],records=[],catalog=[],research=[],places=[],current='Dashboard',pageSequence=0;
const leader=()=>['Leitung','Stellvertreter'].includes(me?.role);
function status(text){$('status').textContent=text;}
async function api(path,method='GET',body,prefer='return=representation'){
 if(session&&session.expires_at<Date.now()/1000+60){
  const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const d=await r.json();if(!r.ok)throw Error('Sitzung abgelaufen. Bitte erneut anmelden.');session=d;sessionStorage.setItem('sick-session',JSON.stringify(d));
 }
 const r=await fetch(URL+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+(session?.access_token||KEY),'Content-Type':'application/json',...(path.startsWith('/rest/v1/')?{Prefer:prefer}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>null);
 if(!r.ok)throw Error(data?.message||data?.msg||data?.error_description||'Anfrage fehlgeschlagen ('+r.status+')');return data;
}
async function guarded(action){try{await action();}catch(e){status(e.message);}}
const configs={
 'Mein Inventar':['inventory',{title:'Gegenstand',quantity:['Anzahl','number'],note:'Aufbewahrung / Notiz'}],
 'Meine Wunschliste':['wishlist',{title:'Gesuchter Gegenstand',quantity:['Anzahl','number'],note:'Notiz'}],
 'Clan-Lager':['storage',{title:'Gegenstand',quantity:['Bestand','number'],minimum:['Mindestbestand','number'],note:'Lagerort'}],
 'Clan-Finanzen':['finance',{title:'Buchung',income:['Einnahme $','number'],expense:['Ausgabe $','number'],note:'Beleg / Zweck'}],
 'Aufgabenverwaltung':['task',{title:'Aufgabe',assignee:['Verantwortlich','member'],due:['Fällig am','datetime-local'],state:['Status',['Offen','In Arbeit','Erledigt']],note:'Beschreibung'}],
 'Schwarzes Brett':['board',{title:'Betreff',note:['Mitteilung','textarea']}],
 'Clan-Ziele':['goal',{title:'Ziel',target:['Zielwert','number'],progress:['Fortschritt','number'],due:['Zieldatum','datetime-local'],note:'Beschreibung'}],
 'Clan-Spezialisierungen':['specialization',{title:'Spezialisierung',assignee:['Mitglied','member'],note:'Aufgabe / Schwerpunkt'}],
 'Fuhrparkverwaltung':['vehicle',{title:'Fahrzeug',assignee:['Besitzer','member'],state:['Status',['Verfügbar','Unterwegs','Beschädigt']],note:'Standort / Kennzeichen'}],
 'Handelsplatz':['trade',{title:'Gegenstand',quantity:['Anzahl','number'],price:['Stückpreis $','number'],state:['Status',['Angebot','Gesuch','Abgeschlossen']],note:'Übergabe / Beschreibung'}],
 'Leihsystem':['loan',{title:'Leihgegenstand',assignee:['Entleiher','member'],quantity:['Anzahl','number'],due:['Rückgabe','datetime-local'],state:['Status',['Ausgeliehen','Zurückgegeben']],note:'Vereinbarung'}],
 'Überfallplanung':['raid',{title:'Ziel',due:['Beginn','datetime-local'],assignee:['Einsatzleitung','member'],state:['Status',['Geplant','Läuft','Abgeschlossen']],note:['Team, Rollen, Werkzeuge und Fluchtweg','textarea']}],
 'Timer-Zentrale':['timer',{title:'Timer',due:['Endet am','datetime-local'],note:'Notiz'}],
 'Fehler- und Verbesserungsvorschläge':['feedback',{title:'Betreff',state:['Art',['Fehler','Verbesserung']],note:['Beschreibung','textarea']}],
 'Preisvergleich':['price',{title:'Gegenstand',price:['Preis $','number'],note:'Händler / Ort / Quelle'}],
 'Herstellungsrezepte':['recipe',{title:'Erzeugnis',quantity:['Ausgabemenge','number'],cost:['Materialkosten $','number'],minutes:['Produktionsdauer Minuten','number'],price:['Verkaufspreis $','number'],note:['Zutaten und Mengen','textarea']}],
 'Systemeinstellungen':['setting',{title:'Einstellung',note:'Wert'}]
};
const groups={Start:['Dashboard','Herstellungsrechner'],Persönlich:['Meine Finanzen','Mein Profil','Meine Basis','Meine Plantage','Mein Skilltree','Meine Wunschliste'],Clan:['Mitglieder','Gemeinsame Forschung','Clan-Finanzen','Schwarzes Brett','Einstellen'],Kommunikation:['Clan-Chat','Private Nachrichten','Benachrichtigungen'],Aktivitäten:['Stadtkarte','Locations','Schlüsselübersicht'],Wiki:['Waffen','Munition','Ausrüstung','Gegenstände','Fahrzeuge','Basis & Einrichtung','Produktion','Händler & Kontakte','Forschungsdatenbank'],Verwaltung:['Rollen & Rechte','Spieldaten bearbeiten','Änderungsverlauf','Datensicherung','Fehler- und Verbesserungsvorschläge','Update- und Versionsübersicht']};
const removedPages=new Set(['Mein Inventar','Clan-Lager','Clan-Ziele','Clan-Spezialisierungen','Fuhrparkverwaltung','Aufgabenverwaltung','Handelsplatz','Leihsystem','Preisvergleich','Beuterechner','Timer-Zentrale','Überfallplanung','Herstellungsrezepte','Systemeinstellungen']);
function navigation(){
 $('nav').innerHTML=Object.entries(groups).filter(([g])=>g!=='Verwaltung'||leader()).map(([group,names])=>`<details ${(group==='Start'||(group==='Persönlich'&&window.innerWidth>800))?'open':''}><summary>${esc(group)}</summary>${names.filter(n=>n!=='Einstellen'||leader()).map(n=>`<button data-page="${esc(n)}">${esc(n)}</button>`).join('')}</details>`).join('');
 $('nav').onclick=e=>{const b=e.target.closest('[data-page]');if(b){go(b.dataset.page);if(window.innerWidth<=800){b.closest('details').open=false;$('heading').scrollIntoView({behavior:'auto',block:'start'});}}};
 $('session').innerHTML='<div class="header-clock"><span id="current-date"></span><strong id="current-time"></strong></div><div class="header-server"><small>Server-Ende</small><span id="server-date"></span><strong id="server-remaining"></strong></div>';
 updateHeader();
}
async function logout(){await features.disablePush().catch(()=>{});await api('/auth/v1/logout','POST',{});sessionStorage.removeItem('sick-session');session=null;me=null;records=[];members=[];$('app').hidden=true;$('login').hidden=false;$('session').replaceChildren();status('Abgemeldet.');}
function updateHeader(){
 if(!me||!$('current-date'))return;
 const now=new Date();$('current-date').textContent=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',year:'numeric'}).format(now);$('current-time').textContent=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);
 const value=rows('setting').find(r=>r.title==='server:end')?.data.server_end_at;
 const candidate=value?new Date(value):null;const end=candidate&&!Number.isNaN(candidate.getTime())?candidate:null;
 $('server-date').textContent=end&&!Number.isNaN(end.getTime())?new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(end):'Noch nicht eingestellt';
 const seconds=end?Math.max(0,Math.floor((end-now)/1000)):null;
 $('server-remaining').textContent=seconds===null?'':seconds===0?'Server beendet':Math.floor(seconds/86400)+' T '+Math.floor(seconds%86400/3600)+' Std '+Math.floor(seconds%3600/60)+' Min '+seconds%60+' Sek';

}
const own=r=>r.owner_id===me.id;
const canEdit=r=>own(r)||(leader()&&!['message','notification'].includes(r.kind));
const rows=kind=>records.filter(r=>r.kind===kind);
const memberName=id=>members.find(p=>p.id===id)?.name||'Mitglied';
function field(name,definition,value=''){
 const [label,type='text']=Array.isArray(definition)?definition:[definition,'text'];
 let control;
 if(type==='datetime-local'&&value){const instant=new Date(value);if(!Number.isNaN(instant.getTime()))value=new Date(instant.getTime()-instant.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 if(Array.isArray(type)||type==='member'){
  const options=type==='member'?members.map(m=>[m.id,m.name]):type.map(v=>Array.isArray(v)?v:[v,v]);
  control=`<select name="${name}">${options.map(([v,t])=>`<option value="${esc(v)}" ${String(value)===v?'selected':''}>${esc(t)}</option>`).join('')}</select>`;
 }else if(type==='textarea')control=`<textarea name="${name}" maxlength="8000" rows="4">${esc(value)}</textarea>`;
 else control=`<input ${name==='title'?'list="game-items"':''} name="${name}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="any"':''} ${name==='title'?'required maxlength="200"':'maxlength="500"'}>`;
 return `<label>${esc(label)}${control}</label>`;
}
function formHTML(fields,values={},submit='Speichern'){return `<form class="recordform"><div class="formgrid">${Object.entries(fields).map(([k,v])=>field(k,v,values[k]??'')).join('')}</div><div class="actions"><button class="primary">${submit}</button></div></form>`;}
function bindForm(form,submit){form.onsubmit=e=>{e.preventDefault();guarded(async()=>{const b=form.querySelector('button[type=submit],button.primary');b.disabled=true;try{await submit(new FormData(form));}finally{b.disabled=false;}});};}
async function saveRecord(kind,title,data,id,recipient){
 const payload={title,data};if(!id)Object.assign(payload,{kind,owner_id:me.id,...(recipient?{recipient_id:recipient}:{})});
 const result=await api('/rest/v1/clan_records'+(id?'?id=eq.'+id:''),id?'PATCH':'POST',payload);
 if(!result?.length)throw Error('Speichern wurde durch die Zugriffsrechte abgelehnt.');
 await loadRecords();status('Gespeichert.');return result[0];
}
async function loadRecords(){
 const all=[];let batch;
 do{batch=await api('/rest/v1/clan_records?select=*&order=created_at.desc,id&limit=500&offset='+all.length);all.push(...batch);}while(batch.length===500);
 records=all;applyCorrections();
}
async function reload(){members=await api('/rest/v1/profiles?select=*&order=name');const p=members.find(p=>p.id===me.id);if(!p?.active)throw Error('Account deaktiviert.');me=p;await loadRecords();}
function go(name){location.hash=encodeURIComponent(name);if(current===name)guarded(()=>page(name));}
window.addEventListener('hashchange',()=>guarded(()=>page(decodeURIComponent(location.hash.slice(1))||'Dashboard')));
async function page(name){
 if(removedPages.has(name))name='Dashboard';if(name==='Accountverwaltung')name='Einstellen';
 const sequence=++pageSequence;current=name;status('');$('heading').textContent=name;
 const group=Object.entries(groups).find(([,pages])=>pages.includes(name))?.[0]||'Clan';
 const pagehead=document.querySelector('.pagehead');pagehead.dataset.group=group;pagehead.classList.toggle('dashboard-head',name==='Dashboard');$('category-label').textContent='SICK CLAN / '+group.toUpperCase();
 document.querySelector('article').scrollTop=0;
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
 features.cleanup();const c=$('content');c.oninput=null;c.replaceChildren();
 if(configs[name])return recordPage(name,c);
 if(name==='Dashboard')return dashboard(c);
 if(['Mein Profil','Meine Basis'].includes(name))return profilePage(name,c);
 if(name==='Meine Plantage')return features.farmPage(c);
 if(['Mein Skilltree','Gemeinsame Forschung','Forschungsdatenbank'].includes(name))return features.researchPage(name,c);
 if(name==='Mitglieder')return membersPage(c);
 if(name==='Meine Finanzen')return walletPage(c);
 if(['Clan-Chat','Private Nachrichten'].includes(name))return features.chatPage(name,c);
 if(name==='Benachrichtigungen')return features.notificationsPage(c);
 if(name==='Einstellen')return settingsPage(c);
 if(name==='Datensicherung')return features.backupPage(c);
 if(name==='Stadtkarte')return features.mapPage(c);
 if(name==='Locations')return features.locationsPage(c);
 if(name==='Schlüsselübersicht')return features.keysPage(c);
 if(name==='Herstellungsrechner')return craftPage(c);
 if(name==='Beuterechner')return lootPage(c);
 if(name==='Rollen & Rechte'){
  c.innerHTML='<div class="panel tablewrap"><table><tr><th>Aktion</th><th>Mitglied</th><th>Stellvertreter</th><th>Leitung</th></tr><tr><td>Eigene Daten, Forschung und Chat</td><td>Ja</td><td>Ja</td><td>Ja</td></tr><tr><td>Kasse und Server-Einstellungen führen</td><td>Lesen</td><td>Ja</td><td>Ja</td></tr><tr><td>Mitgliedskonten anlegen und sperren</td><td>—</td><td>Ja</td><td>Ja</td></tr><tr><td>Leitungsrollen vergeben</td><td>—</td><td>—</td><td>Ja</td></tr><tr><td>Private Nachrichten</td><td colspan="3">Ausschließlich Absender und Empfänger</td></tr></table><p>Die Berechtigungen werden zusätzlich in der Datenbank und Accountfunktion geprüft.</p></div>';return;
 }
 if(name==='Änderungsverlauf'){
  if(!leader())throw Error('Clan-Leitung erforderlich');const data=await api('/rest/v1/clan_audit?select=*&order=created_at.desc&limit=100');if(sequence!==pageSequence)return;
  c.innerHTML='<div class="panel tablewrap"><table><tr><th>Zeit</th><th>Mitglied</th><th>Aktion</th><th>Eintrag</th></tr>'+data.map(r=>`<tr><td>${date(r.created_at)}</td><td>${esc(memberName(r.actor))}</td><td>${esc(r.action)}</td><td>${esc(r.entity)}</td></tr>`).join('')+'</table></div>';return;
 }
 if(name==='Update- und Versionsübersicht'){
  c.innerHTML='<div class="panel"><h2>Version 0.5 · 25.11.2026</h2><p>Neues Clan-Design mit deinem Banner, getrennte Scrollbereiche, persönliche Geldstände, ausführliche Mitgliederprofile und deutsche Location-Details. Accountanlage im Browser korrigiert. Looty-Bay-Stadtplan mit Küsten, Straßen und Gebäuden als Standardansicht. Neues ROB-RUN-Dashboard mit SICK-Logo, Datum und Uhrzeit sowie einstellbarem Server-Ende. Vereinfachte Navigation, 33 Raubschlüssel mit Kartenverknüpfung, überarbeitete Wiki-Kategorien und Accountverwaltung unter Clan → Einstellen.</p><p>Spieldatenstand und Quellen stehen bei den jeweiligen Einträgen. Spielupdates können Preise verändern.</p></div>';return;
 }
 if(name==='Spieldaten bearbeiten'){return editCatalog(c);}
 return catalogPage(name,c);
}
function plantCounts(member){
 const data=rows('plant').find(r=>r.owner_id===member.id)?.data;
 if(data?.tables)return ['green','purple','gold'].map(key=>data.tables.reduce((sum,t)=>sum+(Number(t[key])||0),0));
 return member.plant_counts||[0,0,0];
}
const balanceText=value=>value===null||value===undefined?'Nicht eingetragen':money(value);
function memberFacts(member){
 const counts=plantCounts(member);
 return `<div class="member-money"><div><small>Schwarzgeld</small><strong>${balanceText(member.dirty_cash)}</strong></div><div><small>Gewaschenes Geld</small><strong>${balanceText(member.clean_cash)}</strong></div></div><div class="plant-pills"><span>Grün <b>${counts[0]}</b></span><span>Lila <b>${counts[1]}</b></span><span>Gold <b>${counts[2]}</b></span></div>`;
}
function membersPage(c){
 c.innerHTML='<div class="toolbar"><input id="member-search" type="search" aria-label="Mitglieder suchen" placeholder="Mitglied suchen"></div><div id="member-grid" class="grid"></div>';
 function draw(){
  const query=$('member-search').value.toLowerCase();
  $('member-grid').innerHTML=members.filter(p=>(p.name+' '+p.role).toLowerCase().includes(query)).map(p=>`<button class="panel member-card" data-member="${esc(p.id)}"><span class="member-avatar">${esc(p.name.slice(0,2).toUpperCase())}</span><span class="pill">${esc(p.role)}</span><h2>${esc(p.name)}</h2>${memberFacts(p)}<small>${p.active?'Aktiv':'Gesperrt'} · Profil öffnen</small></button>`).join('')||'<p>Kein Mitglied gefunden.</p>';
  c.querySelectorAll('[data-member]').forEach(button=>button.onclick=()=>showMember(members.find(p=>p.id===button.dataset.member),c));
 }
 $('member-search').oninput=draw;draw();
}
function showMember(member,c){
 const counts=plantCounts(member),done=rows('research').filter(r=>r.owner_id===member.id&&r.data.complete).length;
 c.innerHTML=`<button id="members-back" class="quiet">Mitgliederübersicht</button><div class="panel member-profile"><span class="member-avatar large">${esc(member.name.slice(0,2).toUpperCase())}</span><span class="pill">${esc(member.role)} · ${member.active?'Aktiv':'Gesperrt'}</span><h2>${esc(member.name)}</h2><p>${esc(member.bio||'Noch keine Beschreibung eingetragen.')}</p>${memberFacts(member)}<small>${member.money_updated_at?'Geldstand aktualisiert · '+date(member.money_updated_at):'Geldstand noch nicht eingetragen.'}</small></div><div class="grid"><div class="panel stat"><small>Pflanzen insgesamt</small><strong>${counts.reduce((a,b)=>a+Number(b||0),0)}</strong></div><div class="panel stat"><small>Persönliche Forschungen</small><strong>${done}</strong></div><div class="panel"><h2>Basis & Kontakt</h2><dl class="facts"><dt>Siedlung</dt><dd>${esc(member.settlement||'Nicht eingetragen')}</dd><dt>Siedlungsnummer</dt><dd>${esc(member.settlement_number||'—')}</dd><dt>Basisnummer</dt><dd>${esc(member.base_number||'—')}</dd><dt>Discord</dt><dd>${esc(member.discord||'Nicht eingetragen')}</dd><dt>Spezialisierung</dt><dd>${esc(member.specialization||'Nicht eingetragen')}</dd></dl></div></div>`;
 $('members-back').onclick=()=>membersPage(c);
}
function walletPage(c){
 c.innerHTML='<div class="panel"><h2>Dein Geldstand</h2><p>Trage deine aktuellen Spielbestände ein. Dein Clan kann diese Werte in deinem Mitgliederprofil sehen.</p></div>'+formHTML({dirty_cash:['Schwarzgeld $','number'],clean_cash:['Gewaschenes Geld $','number']},me,'Geldstand speichern')+'<div class="panel">'+memberFacts(me)+'</div>';
 for(const input of c.querySelectorAll('input')){input.step='0.01';input.max='99999999999999.99';input.required=true;}
 bindForm(c.querySelector('form'),async fd=>{
  const data=Object.fromEntries(['dirty_cash','clean_cash'].map(key=>[key,Number(fd.get(key))]));
  if(Object.values(data).some(value=>!Number.isFinite(value)||value<0||value>99999999999999.99))throw Error('Bitte gültige Geldbeträge ab 0 eingeben.');
  const result=await api('/rest/v1/profiles?id=eq.'+me.id,'PATCH',data);if(!result?.length)throw Error('Geldstand konnte nicht gespeichert werden.');
  await reload();walletPage(c);status('Geldstand gespeichert.');
 });
}
function dashboard(c){
 const balance=rows('finance').reduce((sum,r)=>sum+Number(r.data.income||0)-Number(r.data.expense||0),0);
 const plants=plantCounts(me).reduce((sum,n)=>sum+Number(n||0),0);
 c.innerHTML=`<figure class="dashboard-hero"><img src="assets/sick-clan-banner.jpg" alt="Dein SICK-Clan-Banner für ROB RUN"></figure><div class="dashboard-intro"><div><span class="eyebrow">DEIN CLAN. DEIN REVIER.</span><h2>Willkommen, ${esc(me.name)}.</h2><p>Alles für deinen nächsten Run.</p></div><span class="pill">${esc(me.role)}</span></div><div class="grid dashboard-stats">${[[members.filter(m=>m.active).length,'Aktive Mitglieder'],[balanceText(me.dirty_cash),'Dein Schwarzgeld'],[balanceText(me.clean_cash),'Dein gewaschenes Geld'],[plants,'Deine Pflanzen']].map(([value,label])=>`<div class="panel stat"><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><div class="dashboard-columns"><div class="panel"><span class="eyebrow">CLAN-NEWS</span><h2>Schwarzes Brett</h2>${rows('board').slice(0,4).map(r=>`<div class="board-item"><strong>${esc(r.title)}</strong><p>${esc(r.data.note)}</p></div>`).join('')||'<p>Aktuell gibt es keine Mitteilungen.</p>'}</div><div class="panel"><span class="eyebrow">GEMEINSAM WEITER</span><h2>Deine Zentrale</h2><p>Geldstände und Pflanzen pflegen, Mitglieder ansehen oder den nächsten Ort erkunden.</p><div class="quick-links">${['Meine Finanzen','Meine Plantage','Mitglieder','Stadtkarte'].map(name=>`<button data-quick="${esc(name)}">${esc(name)}</button>`).join('')}</div><small>Clan-Kasse · ${money(balance)}</small></div></div>`;
 c.querySelectorAll('[data-quick]').forEach(button=>button.onclick=()=>go(button.dataset.quick));
}
function settingsPage(c){
 if(!leader())throw Error('Clan-Leitung erforderlich');
 const currentEnd=rows('setting').find(r=>r.title==='server:end');
 c.innerHTML='<h2>Serverlaufzeit</h2>'+formHTML({server_end_at:['Server-Ende · deine Ortszeit','datetime-local']},{server_end_at:currentEnd?.data.server_end_at||''},'Server-Ende speichern')+'<section id="clan-accounts"></section>';
 bindForm(c.querySelector('form'),async fd=>{
  const value=fd.get('server_end_at');if(!value)throw Error('Bitte einen Endzeitpunkt auswählen.');
  const end=new Date(value);if(Number.isNaN(end.getTime()))throw Error('Ungültiger Endzeitpunkt.');
  const id='ca3c4392-8c7f-4fc5-b5c9-c04b00621007';
  const data={server_end_at:end.toISOString()};
  if(currentEnd)await api('/rest/v1/clan_records?id=eq.'+currentEnd.id,'PATCH',{data});
  else{await api('/rest/v1/clan_records?on_conflict=id','POST',{id,kind:'setting',title:'server:end',data},'return=representation,resolution=ignore-duplicates');await api('/rest/v1/clan_records?id=eq.'+id,'PATCH',{data});}
  await loadRecords();updateHeader();status('Server-Ende gespeichert.');
 });
 accountPage($('clan-accounts'));
}
function recordPage(name,c){
 const [kind,fields]=configs[name];let editing=null;
 const personal=['inventory','wishlist'].includes(kind);
 const data=rows(kind).filter(r=>!personal||own(r));
 const restricted=['finance','storage','setting'].includes(kind);
 const head=document.createElement('div');const list=document.createElement('div');c.append(head,list);const suggestions=document.createElement('datalist');suggestions.id='game-items';suggestions.innerHTML=catalog.map(item=>`<option value="${esc(item.name)}"></option>`).join('');c.append(suggestions);
 function editor(r){
  editing=r;head.innerHTML=formHTML(fields,r?{title:r.title,...r.data}:{});
  bindForm(head.querySelector('form'),async fd=>{
   const d=Object.fromEntries(fd);const title=d.title.trim();if(!title)throw Error('Bitte einen Namen eingeben.');delete d.title;
   for(const [k,v]of Object.entries(fields))if(Array.isArray(v)&&v[1]==='number'){d[k]=Number(d[k]||0);if(!Number.isFinite(d[k])||d[k]<0)throw Error('Ungültiger Zahlenwert');}
   for(const [key,definition]of Object.entries(fields)){if(Array.isArray(definition)&&definition[1]==='datetime-local'&&d[key])d[key]=new Date(d[key]).toISOString();}
   await saveRecord(kind,title,d,editing?.id);await page(name);
  });
 }
 if(!restricted||leader())editor(null);
 if(kind==='finance')list.innerHTML=`<div class="panel stat"><small>Saldo aus erfassten Buchungen</small><strong>${money(data.reduce((s,r)=>s+Number(r.data.income||0)-Number(r.data.expense||0),0))}</strong></div>`;
 if(kind==='price')data.sort((a,b)=>Number(a.data.price)-Number(b.data.price));
 const grid=document.createElement('div');grid.className='grid';list.append(grid);
 if(!data.length)grid.innerHTML='<div class="panel"><p>Hier sind noch keine Clan-Einträge erfasst.</p></div>';
 for(const r of data){
  const card=document.createElement('div');card.className='panel card';
  card.innerHTML=`${features.icon(catalog.find(item=>item.name===r.title||item.nameOriginal===r.title))}<h2>${esc(r.title)}</h2>${Object.entries(fields).filter(([k])=>k!=='title'&&r.data[k]!==undefined&&r.data[k]!=='').map(([k,v])=>`<p><small>${esc(Array.isArray(v)?v[0]:v)}</small><br>${esc(Array.isArray(v)&&v[1]==='member'?memberName(r.data[k]):r.data[k])}</p>`).join('')}<small>${esc(memberName(r.owner_id))} · ${date(r.updated_at)}</small>`;
  if(kind==='goal')card.innerHTML+=`<progress max="${Math.max(1,Number(r.data.target))}" value="${Number(r.data.progress)||0}"></progress>`;
  if(kind==='storage'&&Number(r.data.quantity)<Number(r.data.minimum))card.innerHTML+='<p class="danger">Mindestbestand unterschritten</p>';
  if(kind==='timer'&&r.data.due)card.innerHTML+=`<p class="countdown" data-end="${esc(r.data.due)}"></p>`;
  if(canEdit(r)&&(!restricted||leader())){
   const actions=document.createElement('div');actions.className='actions';
   const edit=document.createElement('button');edit.textContent='Bearbeiten';edit.onclick=()=>{editor(r);head.scrollIntoView({behavior:'smooth'});};
   const del=document.createElement('button');del.textContent='Löschen';del.onclick=()=>{if(confirm('Eintrag „'+r.title+'“ löschen?'))guarded(async()=>{await api('/rest/v1/clan_records?id=eq.'+r.id,'DELETE');await loadRecords();await page(name);});};actions.append(edit,del);card.append(actions);
  }
  grid.append(card);
 }
}
function profilePage(name,c){
 const fields=name==='Mein Profil'?{name:'Spielername',discord:'Discord',specialization:'Spezialisierung',bio:['Beschreibung','textarea']}:{settlement:'Siedlung',settlement_number:'Siedlungsnummer',base_number:'Basisnummer'};
 c.innerHTML=formHTML(fields,me);
 bindForm(c.querySelector('form'),async fd=>{const result=await api('/rest/v1/profiles?id=eq.'+me.id,'PATCH',Object.fromEntries(fd));if(!result?.length)throw Error('Keine Änderung gespeichert');me=result[0];status('Profil gespeichert.');});
 if(name==='Mein Profil'){
  const signout=document.createElement('button');signout.textContent='Abmelden';signout.onclick=()=>guarded(logout);c.append(signout);
  const section=document.createElement('div');section.innerHTML=formHTML({password:['Neues Passwort','password']},{},'Passwort ändern');c.append(section);
  bindForm(section.querySelector('form'),async fd=>{const password=fd.get('password');if(password.length<6)throw Error('Mindestens 6 Zeichen erforderlich');await api('/auth/v1/user','PUT',{password});section.querySelector('form').reset();status('Passwort geändert.');});
 }
}
function accountPage(c){
 if(!leader())throw Error('Clan-Leitung erforderlich');
 const roles=me.role==='Leitung'?['Mitglied','Stellvertreter','Leitung']:['Mitglied'];
 c.innerHTML='<h2>Account anlegen</h2>'+formHTML({username:'Benutzername',name:'Spielername',password:['Startpasswort','password'],role:['Rolle',roles]},{},'Account anlegen')+'<div id="accounts" class="grid"></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd);await api('/functions/v1/clan-admin','POST',{action:'create',...d});c.querySelector('form').reset();await reload();await page('Einstellen');const credentials=document.createElement('div');credentials.className='panel';credentials.innerHTML='<h2>Account angelegt</h2><p>Benutzer · '+esc(d.username.toLowerCase())+'</p><button>Zugangsdaten kopieren</button>';credentials.querySelector('button').onclick=()=>guarded(async()=>{await navigator.clipboard.writeText('Webseite '+location.origin+location.pathname+'\nBenutzer '+d.username.toLowerCase()+'\nPasswort '+d.password);status('Zugangsdaten kopiert.');});($('clan-accounts')||c).prepend(credentials);status('Account angelegt. Über die Schaltfläche kannst du die Zugangsdaten kopieren.');});
 for(const p of members){const card=document.createElement('div');card.className='panel';card.innerHTML=`<h2>${esc(p.name)}</h2><p>Benutzer · ${esc(p.username||p.name)}</p><p>${esc(p.role)} · ${p.active?'Aktiv':'Gesperrt'}</p><button data-copy-user="${esc(p.username||p.name)}">Benutzernamen kopieren</button>`;card.querySelector('[data-copy-user]').onclick=()=>guarded(async()=>{await navigator.clipboard.writeText(p.username||p.name);status('Benutzername kopiert.');});
  if(p.id!==me.id&&p.id!=='4b9bbb2e-630f-40d9-ab38-761ce9aa57d8'&&(me.role==='Leitung'||p.role==='Mitglied')){
   const form=document.createElement('div');form.innerHTML=formHTML({name:'Spielername',role:['Rolle',roles]},p,'Account speichern');card.append(form);
   bindForm(form.querySelector('form'),async fd=>{await api('/functions/v1/clan-admin','POST',{action:'update',id:p.id,role:fd.get('role'),name:fd.get('name')});await reload();await page(current);});
   const actions=document.createElement('div');actions.className='actions';const toggle=document.createElement('button');toggle.textContent=p.active?'Sperren':'Freischalten';toggle.onclick=()=>guarded(async()=>{await api('/functions/v1/clan-admin','POST',{action:'update',id:p.id,active:!p.active});await reload();await page(current);});
   const reset=document.createElement('button');reset.textContent='Passwort zurücksetzen';reset.onclick=()=>{const password=prompt('Neues Passwort für '+p.name+' (mindestens 6 Zeichen)');if(password)guarded(async()=>{await api('/functions/v1/clan-admin','POST',{action:'password',id:p.id,password});status('Passwort geändert.');});};actions.append(toggle,reset);card.append(actions);
  }
  $('accounts').append(card);
 }
}
function showImage(src){$('largeimage').src=src;$('viewer').showModal();}
$('closeviewer').onclick=()=>$('viewer').close();
let recipes=[];
function craftPage(c){
 c.innerHTML='<div class="panel"><h2>Tausch- und Herstellungsrechner</h2><p>Zutaten aus den veröffentlichten Spielrezepten. Wähle ein Ziel und die benötigte Menge.</p></div><label>Ziel<select id="recipe"></select></label>'+field('amount',['Anzahl','number'],1)+'<div id="ingredients" class="panel"></div>';
 $('recipe').innerHTML=recipes.map((r,i)=>`<option value="${i}">${esc(catalog.find(c=>c.id===r.out.id)?.name||r.out.nameEn||r.out.id)}</option>`).join('');
 function draw(){const r=recipes[Number($('recipe').value)];const n=Number(c.querySelector('[name=amount]').value);if(!r||!(n>0)){ $('ingredients').textContent='Positive Menge eingeben.';return;}$('ingredients').innerHTML='<h2>Benötigte Zutaten</h2>'+r.in.map(v=>`<p>${esc(v.amount*n)} × ${esc(v.nameEn||catalog.find(c=>c.id===v.id)?.name||v.id)}</p>`).join('');}
 c.oninput=draw;draw();

}
function lootPage(c){
 c.innerHTML=formHTML({item:['Gegenstand',catalog.filter(x=>x.price!=null).map(x=>[x.id,x.name+' · '+x.rarity+' · '+money(x.price)])],quantity:['Anzahl','number'],bonus:['Verkaufsbonus %','number'],team:['Teamgröße','number']},{quantity:1,bonus:0,team:1},'Berechnen')+'<div id="lootresult" class="panel"></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd),item=catalog.find(x=>x.id===d.item);if(!Number.isInteger(Number(d.team))||Number(d.team)<1||!Number.isInteger(Number(d.quantity))||Number(d.quantity)<0)throw Error('Menge und Teamgröße prüfen');const total=item.price*Number(d.quantity)*(1+Number(d.bonus)/100);$('lootresult').innerHTML=`<h2>${money(total)}</h2><p>Pro Person · ${money(total/Number(d.team))}</p><p>Basiswert aus dem Spielkatalog. Der eingegebene Verkaufsbonus wird zusätzlich angewendet.</p>`;});
}
const categories={Waffen:['Weapons'],Munition:['Ammo'],Ausrüstung:['Armor','Medicine','Grenades','Weapon maintenance','Breaching tools','Tools'],Gegenstände:['Valuables','Cargo','Cumulative items','Misc','Keys'],Fahrzeuge:['Vehicles','Car upgrades'],'Basis & Einrichtung':['Furniture & objects','Home & plot','Plot buildings','Security','Documents'],Produktion:['Laboratory','Workbenches & upgrades'],'Händler & Kontakte':['NPC']};
function catalogPage(name,c){
 const allowed=categories[name];if(!allowed){c.innerHTML='<div class="panel"><p>Bereich nicht gefunden.</p></div>';return;}
 c.innerHTML='<div class="toolbar"><input id="catalogsearch" type="search" aria-label="Katalog durchsuchen" placeholder="Name, Kategorie oder Fundort"><select id="catalogsort" aria-label="Sortierung"><option value="name">Name</option><option value="price">Preis aufsteigend</option></select></div><p id="catalogcount"></p><div id="cataloggrid" class="grid"></div><button id="more">Weitere anzeigen</button>';
 let visible=36;
 function draw(){const q=$('catalogsearch').value.toLowerCase();let found=catalog.filter(x=>(!allowed.length||allowed.includes(x.wikiCategory||x.categoryOriginal||x.category))&&(x.name+' '+(x.nameOriginal||'')+' '+x.category+' '+x.places.join(' ')).toLowerCase().includes(q));found.sort($('catalogsort').value==='price'?((a,b)=>(a.price??Infinity)-(b.price??Infinity)):((a,b)=>a.name.localeCompare(b.name)));
 $('catalogcount').textContent=found.length+' Gegenstände · Spielstand 0.7.0';$('cataloggrid').innerHTML=found.slice(0,visible).map(x=>`<div class="panel card">${x.sprite?`<div role="img" aria-label="${esc(x.name)}" class="gameicon" style="background-image:url(${esc(x.image)});background-position:-${x.sprite.x}px -${x.sprite.y}px"></div>`:''}<h2>${esc(x.name)}</h2><span class="pill">${esc(x.rarity||x.category)}</span>${x.price!=null?`<p>${money(x.price)} · Katalogwert</p>`:''}${!x.sprite?'<p class="muted">Die Quelle enthält kein Einzelbild.</p>':''}${x.stats?`<p>${esc(x.stats.rpm)} Schuss/min · Magazin ${esc(x.stats.magazine)}</p>`:''}${x.places.length?`<p>${esc(x.places.join(', '))}</p>`:''}<a href="${esc(x.source)}" target="_blank" rel="noopener">Spielwert und Quelle</a></div>`).join('');$('more').hidden=visible>=found.length;
 }
 $('catalogsearch').oninput=()=>{visible=36;draw();};$('catalogsort').onchange=draw;$('more').onclick=()=>{visible+=36;draw();};draw();
}
$('search').oninput=()=>{const q=$('search').value.trim().toLowerCase();if(!q){guarded(()=>page(current));return;}$('heading').textContent='Suchergebnisse';const results=[...members.filter(p=>p.name.toLowerCase().includes(q)).map(p=>({title:p.name,detail:p.specialization,page:'Mitglieder'})),...records.filter(r=>!['inventory','task','storage','goal','specialization','vehicle','trade','loan','raid','timer','price','recipe'].includes(r.kind)&&(r.title+' '+JSON.stringify(r.data)).toLowerCase().includes(q)).map(r=>({title:r.title,detail:r.data.note,page:Object.entries(configs).find(([,v])=>v[0]===r.kind)?.[0]||'Dashboard'})),...catalog.filter(x=>(x.name+' '+(x.nameOriginal||'')).toLowerCase().includes(q)).slice(0,30).map(x=>({title:x.name,detail:x.price==null?x.category:money(x.price),page:Object.entries(categories).find(([,allowed])=>allowed.includes(x.wikiCategory||x.categoryOriginal||x.category))?.[0]||'Gegenstände'}))];$('content').innerHTML='<div class="grid">'+results.slice(0,60).map(r=>`<div class="panel"><h2>${esc(r.title)}</h2><p>${esc(r.detail)}</p><button data-result="${esc(r.page)}">Öffnen</button></div>`).join('')+'</div>';$('content').querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{$('search').value='';go(b.dataset.result);});};
$('refresh').onclick=()=>guarded(async()=>{await reload();await page(current);status('Aktualisiert.');});
setInterval(()=>{updateHeader();document.querySelectorAll('.countdown').forEach(e=>{const sec=Math.max(0,Math.floor((new Date(e.dataset.end)-Date.now())/1000));e.textContent=sec?Math.floor(sec/3600)+' h '+Math.floor(sec%3600/60)+' min '+sec%60+' s':'Timer abgelaufen';});},1000);
async function enter(){
 const profiles=await api('/rest/v1/profiles?select=*');me=profiles.find(p=>p.id===session.user.id);if(!me?.active)throw Error('Account ist nicht freigeschaltet.');members=profiles;
 await loadRecords();
 [catalog,research,places,recipes]=await Promise.all(['catalog','research','places','recipes'].map(async n=>{const r=await fetch('data/'+n+'.json',{cache:'no-cache'});if(!r.ok)throw Error('Spieldaten konnten nicht geladen werden');return r.json();}));
 catalog=catalog.filter(item=>item.id!=='vendor_tree_unknown_item');recipes=recipes.filter(recipe=>recipe.available!==false);applyCorrections();$('login').hidden=true;$('app').hidden=false;navigation();await page(decodeURIComponent(location.hash.slice(1))||'Dashboard');
}
$('login').onsubmit=e=>{e.preventDefault();guarded(async()=>{const b=e.target.querySelector('button');b.disabled=true;try{const username=e.target.username.value.trim().toLowerCase();session=await api('/auth/v1/token?grant_type=password','POST',{email:username+'@sick-clan.invalid',password:e.target.password.value});sessionStorage.setItem('sick-session',JSON.stringify(session));await enter();e.target.reset();}finally{b.disabled=false;}});};
const features=createFeatures({ $,esc,api,guarded,saveRecord,loadRecords,money,memberName,own,showImage,status,
 go,get currentPage(){return current;},reload,get me(){return me;},get records(){return records;},get members(){return members;},get research(){return research;},get places(){return places;},get catalog(){return catalog;},get session(){return session;},url:URL,key:KEY });
try{session=JSON.parse(sessionStorage.getItem('sick-session'));if(session)await enter();}catch(e){session=null;sessionStorage.removeItem('sick-session');status(e.message);}
function editCatalog(c){
 if(!leader())throw Error('Clan-Leitung erforderlich');
 c.innerHTML=formHTML({item:['Gegenstand',catalog.map(x=>[x.id,x.name+' · '+x.rarity])],price:['Belegter Preis $','number'],source:'Quellen-URL',note:['Beleg / Spielversion','textarea']},{},'Spielwert speichern')+'<div class="panel"><p>Gespeicherte Korrekturen werden für alle Mitglieder im Katalog und in Ortsdetails verwendet. Die ursprünglichen Daten bleiben im Quellenarchiv erhalten.</p></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd);const item=catalog.find(x=>x.id===d.item);const u=new window.URL(d.source);if(u.protocol!=='https:')throw Error('HTTPS-Quellenadresse erforderlich');if(!(Number(d.price)>=0))throw Error('Ungültiger Preis');const prior=rows('setting').find(r=>r.title==='catalog:'+item.id);await saveRecord('setting','catalog:'+item.id,{price:Number(d.price),source:d.source,note:d.note},prior?.id);applyCorrections();status('Spielwert gespeichert.');});
}
function applyCorrections(){for(const r of rows('setting').filter(r=>r.title.startsWith('catalog:'))){const item=catalog.find(x=>x.id===r.title.slice(8));if(item&&Number.isFinite(r.data.price)&&/^https:\/\//.test(r.data.source||'')){item.price=r.data.price;item.source=r.data.source;}}}
