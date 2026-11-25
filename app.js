import { createFeatures } from './features.js?v=0.3';
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
 const r=await fetch(URL+path,{method,headers:{apikey:KEY,Authorization:'Bearer '+(session?.access_token||KEY),'Content-Type':'application/json',Prefer:prefer},...(body!==undefined?{body:JSON.stringify(body)}:{})});
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
const groups={Start:['Dashboard'],Persönlich:['Mein Profil','Meine Basis','Meine Plantage','Mein Skilltree','Mein Inventar','Meine Wunschliste'],Clan:['Mitglieder','Gemeinsame Forschung','Clan-Lager','Clan-Finanzen','Aufgabenverwaltung','Schwarzes Brett','Clan-Ziele','Clan-Spezialisierungen','Fuhrparkverwaltung'],Kommunikation:['Clan-Chat','Private Nachrichten','Benachrichtigungen'],Handel:['Handelsplatz','Leihsystem','Preisvergleich'],Aktivitäten:['Überfallplanung','Stadtkarte','Schlüsselübersicht','Timer-Zentrale','Beuterechner'],Wiki:['Waffen','Munition','Ausrüstung','Gegenstände','Fahrzeuge','Basis & Einrichtung','Produktion','Forschungsdatenbank','Herstellungsrechner','Herstellungsrezepte'],Verwaltung:['Accountverwaltung','Rollen & Rechte','Spieldaten bearbeiten','Änderungsverlauf','Systemeinstellungen','Datensicherung','Fehler- und Verbesserungsvorschläge','Update- und Versionsübersicht']};
function navigation(){
 $('nav').innerHTML=Object.entries(groups).filter(([g])=>g!=='Verwaltung'||leader()).map(([group,names])=>`<details ${(group==='Start'||(group==='Persönlich'&&window.innerWidth>800))?'open':''}><summary>${esc(group)}</summary>${names.map(n=>`<button data-page="${esc(n)}">${esc(n)}</button>`).join('')}</details>`).join('');
 $('nav').onclick=e=>{const b=e.target.closest('[data-page]');if(b){go(b.dataset.page);if(window.innerWidth<=800){b.closest('details').open=false;$('heading').scrollIntoView({behavior:'auto',block:'start'});}}};
 $('session').innerHTML=`<small>${esc(me.name)} · ${esc(me.role)}</small> <button id="logout">Abmelden</button>`;
 $('logout').onclick=()=>guarded(async()=>{await features.disablePush().catch(()=>{});await api('/auth/v1/logout','POST',{});sessionStorage.removeItem('sick-session');session=null;me=null;records=[];members=[];$('app').hidden=true;$('login').hidden=false;$('session').replaceChildren();status('Abgemeldet.');});
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
 const sequence=++pageSequence;current=name;status('');$('heading').textContent=name;
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===name));
 features.cleanup();const c=$('content');c.oninput=null;c.replaceChildren();
 if(configs[name])return recordPage(name,c);
 if(name==='Dashboard')return dashboard(c);
 if(['Mein Profil','Meine Basis'].includes(name))return profilePage(name,c);
 if(name==='Meine Plantage')return features.farmPage(c);
 if(['Mein Skilltree','Gemeinsame Forschung','Forschungsdatenbank'].includes(name))return features.researchPage(name,c);
 if(name==='Mitglieder'){
  c.innerHTML='<div class="grid">'+members.map(p=>`<div class="panel"><h2>${esc(p.name)}</h2><span class="pill">${esc(p.role)}</span><p>${esc(p.specialization)}</p><p>${esc(p.bio)}</p><small>${esc(p.settlement)} · Basis ${esc(p.base_number)} · ${p.active?'Aktiv':'Gesperrt'}</small></div>`).join('')+'</div>';return;
 }
 if(['Clan-Chat','Private Nachrichten'].includes(name))return features.chatPage(name,c);
 if(name==='Benachrichtigungen')return features.notificationsPage(c);
 if(name==='Accountverwaltung')return accountPage(c);
 if(name==='Datensicherung')return features.backupPage(c);
 if(name==='Stadtkarte')return features.mapPage(c);
 if(name==='Herstellungsrechner')return craftPage(c);
 if(name==='Beuterechner')return lootPage(c);
 if(name==='Rollen & Rechte'){
  c.innerHTML='<div class="panel tablewrap"><table><tr><th>Aktion</th><th>Mitglied</th><th>Stellvertreter</th><th>Leitung</th></tr><tr><td>Eigene Daten, Chat, Handel, Planung</td><td>Ja</td><td>Ja</td><td>Ja</td></tr><tr><td>Clan-Lager, Kasse, Einstellungen führen</td><td>Lesen</td><td>Ja</td><td>Ja</td></tr><tr><td>Mitgliedskonten anlegen und sperren</td><td>—</td><td>Ja</td><td>Ja</td></tr><tr><td>Leitungsrollen vergeben</td><td>—</td><td>—</td><td>Ja</td></tr><tr><td>Private Nachrichten</td><td colspan="3">Ausschließlich Absender und Empfänger</td></tr></table><p>Die Berechtigungen werden zusätzlich in der Datenbank und Accountfunktion geprüft.</p></div>';return;
 }
 if(name==='Änderungsverlauf'){
  if(!leader())throw Error('Clan-Leitung erforderlich');const data=await api('/rest/v1/clan_audit?select=*&order=created_at.desc&limit=100');if(sequence!==pageSequence)return;
  c.innerHTML='<div class="panel tablewrap"><table><tr><th>Zeit</th><th>Mitglied</th><th>Aktion</th><th>Eintrag</th></tr>'+data.map(r=>`<tr><td>${date(r.created_at)}</td><td>${esc(memberName(r.actor))}</td><td>${esc(r.action)}</td><td>${esc(r.entity)}</td></tr>`).join('')+'</table></div>';return;
 }
 if(name==='Update- und Versionsübersicht'){
  c.innerHTML='<div class="panel"><h2>Version 0.3 · 25.11.2026</h2><p>Deutsche Spieldaten, interaktive Karten, grafischer Forschungsbaum, automatische Chats mit Bildern und Lesebestätigungen, Pushmeldungen und Wiederherstellung gemeinsamer Claneinträge.</p><p>Spieldatenstand und Quellen stehen bei den jeweiligen Einträgen. Spielupdates können Preise verändern.</p></div>';return;
 }
 if(name==='Spieldaten bearbeiten'){return editCatalog(c);}
 return catalogPage(name,c);
}
function dashboard(c){
 const balance=rows('finance').reduce((s,r)=>s+Number(r.data.income||0)-Number(r.data.expense||0),0);
 const low=rows('storage').filter(r=>Number(r.data.quantity)<Number(r.data.minimum));
 c.innerHTML=`<div class="panel"><small>CLANÜBERSICHT</small><h2>Willkommen, ${esc(me.name)}.</h2><p>${esc(me.settlement||'Siedlung im Profil eintragen')} · ${esc(me.specialization||me.role)}</p></div><div class="grid">${[[members.filter(m=>m.active).length,'Aktive Mitglieder'],[rows('task').filter(r=>r.data.state!=='Erledigt').length,'Offene Aufgaben'],[money(balance),'Clan-Kasse'],[low.length,'Lagerwarnungen']].map(([n,l])=>`<div class="panel stat"><small>${l}</small><strong>${esc(n)}</strong></div>`).join('')}</div><div class="grid"><div class="panel"><h2>Aktuelle Mitteilungen</h2>${rows('board').slice(0,4).map(r=>`<p><strong>${esc(r.title)}</strong><br>${esc(r.data.note)}</p>`).join('')||'<p>Neue Mitteilungen kannst du am Schwarzen Brett veröffentlichen.</p>'}</div><div class="panel"><h2>Mindestbestand</h2>${low.map(r=>`<p>${esc(r.title)} · ${esc(r.data.quantity)} / ${esc(r.data.minimum)}</p>`).join('')||'<p>Alle erfassten Mindestbestände sind gedeckt.</p>'}</div></div>`;
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
  const section=document.createElement('div');section.innerHTML=formHTML({password:['Neues Passwort','password']},{},'Passwort ändern');c.append(section);
  bindForm(section.querySelector('form'),async fd=>{const password=fd.get('password');if(password.length<6)throw Error('Mindestens 6 Zeichen erforderlich');await api('/auth/v1/user','PUT',{password});section.querySelector('form').reset();status('Passwort geändert.');});
 }
}
function accountPage(c){
 if(!leader())throw Error('Clan-Leitung erforderlich');
 const roles=me.role==='Leitung'?['Mitglied','Stellvertreter','Leitung']:['Mitglied'];
 c.innerHTML='<h2>Account anlegen</h2>'+formHTML({username:'Benutzername',name:'Spielername',password:['Startpasswort','password'],role:['Rolle',roles]},{},'Account anlegen')+'<div id="accounts" class="grid"></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd);await api('/functions/v1/clan-admin','POST',{action:'create',...d});c.querySelector('form').reset();await reload();await page('Accountverwaltung');const credentials=document.createElement('div');credentials.className='panel';credentials.innerHTML='<h2>Account angelegt</h2><p>Benutzer · '+esc(d.username.toLowerCase())+'</p><button>Zugangsdaten kopieren</button>';credentials.querySelector('button').onclick=()=>guarded(async()=>{await navigator.clipboard.writeText('Webseite '+location.origin+location.pathname+'\nBenutzer '+d.username.toLowerCase()+'\nPasswort '+d.password);status('Zugangsdaten kopiert.');});c.prepend(credentials);status('Account angelegt. Über die Schaltfläche kannst du die Zugangsdaten kopieren.');});
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
 c.innerHTML='<div class="panel"><h2>Tausch- und Herstellungsrechner</h2><p>Zutaten aus den veröffentlichten Spielrezepten. Zusätzliche eigene Produktionsrezepte verwaltest du unter Herstellungsrezepte.</p></div><label>Ziel<select id="recipe"></select></label>'+field('amount',['Anzahl','number'],1)+'<div id="ingredients" class="panel"></div>';
 $('recipe').innerHTML=recipes.map((r,i)=>`<option value="${i}">${esc(catalog.find(c=>c.id===r.out.id)?.name||r.out.nameEn||r.out.id)}</option>`).join('');
 function draw(){const r=recipes[Number($('recipe').value)];const n=Number(c.querySelector('[name=amount]').value);if(!r||!(n>0)){ $('ingredients').textContent='Positive Menge eingeben.';return;}$('ingredients').innerHTML='<h2>Benötigte Zutaten</h2>'+r.in.map(v=>`<p>${esc(v.amount*n)} × ${esc(v.nameEn||catalog.find(c=>c.id===v.id)?.name||v.id)}</p>`).join('');}
 c.oninput=draw;draw();
 const ownRecipes=rows('recipe');if(ownRecipes.length){const p=document.createElement('div');p.className='grid';p.innerHTML=ownRecipes.map(r=>`<div class="panel"><h2>${esc(r.title)}</h2><p>${esc(r.data.note)}</p><p>Gewinn je Durchgang · ${money(Number(r.data.price)*Number(r.data.quantity)-Number(r.data.cost))}</p><p>Dauer · ${esc(r.data.minutes)} Minuten</p></div>`).join('');c.append(p);}
}
function lootPage(c){
 c.innerHTML=formHTML({item:['Gegenstand',catalog.filter(x=>x.price!=null).map(x=>[x.id,x.name+' · '+x.rarity+' · '+money(x.price)])],quantity:['Anzahl','number'],bonus:['Verkaufsbonus %','number'],team:['Teamgröße','number']},{quantity:1,bonus:0,team:1},'Berechnen')+'<div id="lootresult" class="panel"></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd),item=catalog.find(x=>x.id===d.item);if(!Number.isInteger(Number(d.team))||Number(d.team)<1||!Number.isInteger(Number(d.quantity))||Number(d.quantity)<0)throw Error('Menge und Teamgröße prüfen');const total=item.price*Number(d.quantity)*(1+Number(d.bonus)/100);$('lootresult').innerHTML=`<h2>${money(total)}</h2><p>Pro Person · ${money(total/Number(d.team))}</p><p>Basiswert aus dem Spielkatalog. Der eingegebene Verkaufsbonus wird zusätzlich angewendet.</p>`;});
}
const categories={Waffen:['Weapons'],Munition:['Ammo'],Ausrüstung:['Armor','Medicine','Grenades'],Gegenstände:[],Fahrzeuge:['Vehicles','Car upgrades'],'Basis & Einrichtung':['Furniture & objects','Home & plot','Plot buildings','Security'],Produktion:['Laboratory','Workbenches & upgrades'],Schlüsselübersicht:['Keys','Breaching tools','Documents']};
function catalogPage(name,c){
 const allowed=categories[name];if(!allowed){c.innerHTML='<div class="panel"><p>Bereich nicht gefunden.</p></div>';return;}
 c.innerHTML='<div class="toolbar"><input id="catalogsearch" type="search" aria-label="Katalog durchsuchen" placeholder="Name, Kategorie oder Fundort"><select id="catalogsort" aria-label="Sortierung"><option value="name">Name</option><option value="price">Preis aufsteigend</option></select></div><p id="catalogcount"></p><div id="cataloggrid" class="grid"></div><button id="more">Weitere anzeigen</button>';
 let visible=36;
 function draw(){const q=$('catalogsearch').value.toLowerCase();let found=catalog.filter(x=>(!allowed.length||allowed.includes(x.categoryOriginal||x.category))&&(x.name+' '+(x.nameOriginal||'')+' '+x.category+' '+x.places.join(' ')).toLowerCase().includes(q));found.sort($('catalogsort').value==='price'?((a,b)=>(a.price??Infinity)-(b.price??Infinity)):((a,b)=>a.name.localeCompare(b.name)));
 $('catalogcount').textContent=found.length+' Gegenstände · Spielstand 0.7.0';$('cataloggrid').innerHTML=found.slice(0,visible).map(x=>`<div class="panel card">${x.sprite?`<div role="img" aria-label="${esc(x.name)}" class="gameicon" style="background-image:url(${esc(x.image)});background-position:-${x.sprite.x}px -${x.sprite.y}px"></div>`:''}<h2>${esc(x.name)}</h2><span class="pill">${esc(x.rarity||x.category)}</span>${x.price!=null?`<p>${money(x.price)} · Katalogwert</p>`:''}${x.stats?`<p>${esc(x.stats.rpm)} Schuss/min · Magazin ${esc(x.stats.magazine)}</p>`:''}${x.places.length?`<p>${esc(x.places.join(', '))}</p>`:''}<a href="${esc(x.source)}" target="_blank" rel="noopener">Spielwert und Quelle</a></div>`).join('');$('more').hidden=visible>=found.length;
 }
 $('catalogsearch').oninput=()=>{visible=36;draw();};$('catalogsort').onchange=draw;$('more').onclick=()=>{visible+=36;draw();};draw();
}
$('search').oninput=()=>{const q=$('search').value.trim().toLowerCase();if(!q){guarded(()=>page(current));return;}$('heading').textContent='Suchergebnisse';const results=[...members.filter(p=>p.name.toLowerCase().includes(q)).map(p=>({title:p.name,detail:p.specialization,page:'Mitglieder'})),...records.filter(r=>(r.title+' '+JSON.stringify(r.data)).toLowerCase().includes(q)).map(r=>({title:r.title,detail:r.data.note,page:Object.entries(configs).find(([,v])=>v[0]===r.kind)?.[0]||'Dashboard'})),...catalog.filter(x=>(x.name+' '+(x.nameOriginal||'')).toLowerCase().includes(q)).slice(0,30).map(x=>({title:x.name,detail:x.price==null?x.category:money(x.price),page:'Gegenstände'}))];$('content').innerHTML='<div class="grid">'+results.slice(0,60).map(r=>`<div class="panel"><h2>${esc(r.title)}</h2><p>${esc(r.detail)}</p><button data-result="${esc(r.page)}">Öffnen</button></div>`).join('')+'</div>';$('content').querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{$('search').value='';go(b.dataset.result);});};
$('refresh').onclick=()=>guarded(async()=>{await reload();await page(current);status('Aktualisiert.');});
setInterval(()=>{document.querySelectorAll('.countdown').forEach(e=>{const sec=Math.max(0,Math.floor((new Date(e.dataset.end)-Date.now())/1000));e.textContent=sec?Math.floor(sec/3600)+' h '+Math.floor(sec%3600/60)+' min '+sec%60+' s':'Timer abgelaufen';});},1000);
async function enter(){
 const profiles=await api('/rest/v1/profiles?select=*');me=profiles.find(p=>p.id===session.user.id);if(!me?.active)throw Error('Account ist nicht freigeschaltet.');members=profiles;
 await loadRecords();
 [catalog,research,places,recipes]=await Promise.all(['catalog','research','places','recipes'].map(async n=>{const r=await fetch('data/'+n+'.json',{cache:'no-cache'});if(!r.ok)throw Error('Spieldaten konnten nicht geladen werden');return r.json();}));
 catalog=catalog.filter(item=>item.id!=='vendor_tree_unknown_item');applyCorrections();$('login').hidden=true;$('app').hidden=false;navigation();await page(decodeURIComponent(location.hash.slice(1))||'Dashboard');
}
$('login').onsubmit=e=>{e.preventDefault();guarded(async()=>{const b=e.target.querySelector('button');b.disabled=true;try{const username=e.target.username.value.trim().toLowerCase();session=await api('/auth/v1/token?grant_type=password','POST',{email:username+'@sick-clan.invalid',password:e.target.password.value});sessionStorage.setItem('sick-session',JSON.stringify(session));await enter();e.target.reset();}finally{b.disabled=false;}});};
const features=createFeatures({ $,esc,api,guarded,saveRecord,loadRecords,money,memberName,own,showImage,status,
 get currentPage(){return current;},reload,get me(){return me;},get records(){return records;},get members(){return members;},get research(){return research;},get places(){return places;},get catalog(){return catalog;},get session(){return session;},url:URL,key:KEY });
try{session=JSON.parse(sessionStorage.getItem('sick-session'));if(session)await enter();}catch(e){session=null;sessionStorage.removeItem('sick-session');status(e.message);}
function editCatalog(c){
 if(!leader())throw Error('Clan-Leitung erforderlich');
 c.innerHTML=formHTML({item:['Gegenstand',catalog.map(x=>[x.id,x.name+' · '+x.rarity])],price:['Belegter Preis $','number'],source:'Quellen-URL',note:['Beleg / Spielversion','textarea']},{},'Spielwert speichern')+'<div class="panel"><p>Gespeicherte Korrekturen werden für alle Mitglieder im Katalog und Beuterechner verwendet. Die ursprünglichen Daten bleiben im Quellenarchiv erhalten.</p></div>';
 bindForm(c.querySelector('form'),async fd=>{const d=Object.fromEntries(fd);const item=catalog.find(x=>x.id===d.item);const u=new window.URL(d.source);if(u.protocol!=='https:')throw Error('HTTPS-Quellenadresse erforderlich');if(!(Number(d.price)>=0))throw Error('Ungültiger Preis');const prior=rows('setting').find(r=>r.title==='catalog:'+item.id);await saveRecord('setting','catalog:'+item.id,{price:Number(d.price),source:d.source,note:d.note},prior?.id);applyCorrections();status('Spielwert gespeichert.');});
}
function applyCorrections(){for(const r of rows('setting').filter(r=>r.title.startsWith('catalog:'))){const item=catalog.find(x=>x.id===r.title.slice(8));if(item&&Number.isFinite(r.data.price)&&/^https:\/\//.test(r.data.source||'')){item.price=r.data.price;item.source=r.data.source;}}}
