import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.86.0';
const cors={'Access-Control-Allow-Origin':'https://ybiene.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
 try {
  if(req.method!=='POST')return reply({message:'Methode nicht erlaubt'},405);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const jwt=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  const {data:{user},error:authError}=await admin.auth.getUser(jwt);
  if(authError||!user)return reply({message:'Anmeldung erforderlich'},401);
  const {data:actor}=await admin.from('profiles').select('role,active').eq('id',user.id).single();
  if(!actor?.active||!['Leitung','Stellvertreter'].includes(actor.role))return reply({message:'Clan-Leitung erforderlich'},403);
  const body=await req.json();
  const owner='4b9bbb2e-630f-40d9-ab38-761ce9aa57d8';
  if(body.action==='create'){
   const username=String(body.username||'').trim().toLowerCase();
   if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username))return reply({message:'Benutzername muss 3–40 Zeichen enthalten'},400);
   if(typeof body.password!=='string'||body.password.length<6)return reply({message:'Passwort muss mindestens 6 Zeichen enthalten'},400);
   const role=body.role||'Mitglied';
   if(!['Leitung','Stellvertreter','Mitglied'].includes(role))return reply({message:'Ungültige Rolle'},400);
   if(actor.role!=='Leitung'&&role!=='Mitglied')return reply({message:'Nur Leitung darf Leitungsrollen vergeben'},403);
   const {data,error}=await admin.auth.admin.createUser({email:username+'@sick-clan.invalid',password:body.password,email_confirm:true});
   if(error)throw error;
   const {error:profileError}=await admin.from('profiles').insert({id:data.user.id,username,name:body.name||username,role});
   if(profileError){await admin.auth.admin.deleteUser(data.user.id);throw profileError;}
   return reply({id:data.user.id,username});
  }
  const {data:target}=await admin.from('profiles').select('id,role').eq('id',body.id).single();
  if(!target)return reply({message:'Account nicht gefunden'},404);
  if(target.id===owner)return reply({message:'Der Eigentümeraccount bleibt geschützt'},403);
  if(target.id===user.id)return reply({message:'Eigenen Account über Mein Profil verwalten'},400);
  if(actor.role!=='Leitung'&&target.role!=='Mitglied')return reply({message:'Leitungsaccount geschützt'},403);
  if(body.action==='password'){
   if(typeof body.password!=='string'||body.password.length<6)return reply({message:'Passwort zu kurz'},400);
   const {error}=await admin.auth.admin.updateUserById(target.id,{password:body.password});if(error)throw error;
  } else if(body.action==='update'){
   const changes: Record<string, unknown> = {};
   if ('role' in body) {
    if (!['Leitung','Stellvertreter','Mitglied'].includes(body.role)) return reply({message:'Ungültige Rolle'},400);
    if (actor.role!=='Leitung' && body.role!=='Mitglied') return reply({message:'Rolle geschützt'},403);
    changes.role=body.role;
   }
   if ('active' in body) {
    if (typeof body.active!=='boolean') return reply({message:'Ungültiger Accountstatus'},400);
    changes.active=body.active;
   }
   if ('name' in body) {
    if (typeof body.name!=='string' || body.name.trim().length<1 || body.name.trim().length>80) return reply({message:'Spielername muss 1–80 Zeichen enthalten'},400);
    changes.name=body.name.trim();
   }
   if (!Object.keys(changes).length) return reply({message:'Keine Änderungen angegeben'},400);
   const {error}=await admin.from('profiles').update(changes).eq('id',target.id);if(error)throw error;
  } else return reply({message:'Unbekannte Aktion'},400);
  await admin.from('clan_audit').insert({actor:user.id,action:body.action,entity:'account:'+target.id});
  return reply({ok:true});
 } catch(error){return reply({message:error instanceof Error?error.message:'Anfrage fehlgeschlagen'},400);}
});
