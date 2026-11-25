import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import webpush from 'npm:web-push@3.6.7';
const headers = { 'Access-Control-Allow-Origin': 'https://ybiene.github.io', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Content-Type': 'application/json' };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
Deno.serve(async request => {
 if (request.method === 'OPTIONS') return new Response(null, { headers });
 if (request.method !== 'POST') return reply({ message: 'Methode nicht erlaubt' }, 405);
 const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
 try {
  const body = await request.json();
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  let { data: config } = await admin.from('clan_push_config').select('value').eq('singleton', true).maybeSingle();
  if (body.action === 'run') {
   if (!config || token !== config.value.cron_secret) return reply({ message: 'Nicht autorisiert' }, 401);
   return reply(await deliver(admin, config.value));
  }
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return reply({ message: 'Anmeldung erforderlich' }, 401);
  const { data: profile } = await admin.from('profiles').select('active').eq('id', user.id).single();
  if (!profile?.active) return reply({ message: 'Account nicht freigeschaltet' }, 403);
  if (!config) {
   const keys = webpush.generateVAPIDKeys();
   const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
   const { error: insertError } = await admin.from('clan_push_config').upsert({ singleton: true, value: { ...keys, cron_secret: secret } }, { onConflict: 'singleton', ignoreDuplicates: true });
   if (insertError) throw insertError;
   ({ data: config } = await admin.from('clan_push_config').select('value').eq('singleton', true).single());
  }
  if (body.action === 'public-key') return reply({ publicKey: config!.value.publicKey });
  if (body.action === 'subscribe') {
   const subscription = body.subscription;
   const endpoint = new URL(subscription?.endpoint);
   const host = endpoint.hostname;
   const allowed = host === 'fcm.googleapis.com' || host.endsWith('.push.services.mozilla.com') || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com') || host.endsWith('.push.microsoft.com');
   if (endpoint.protocol !== 'https:' || !allowed || !subscription.keys?.auth || !subscription.keys?.p256dh || JSON.stringify(subscription).length > 6000) return reply({ message: 'Ungültiges Push-Abonnement' }, 400);
   const { data: existing } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', endpoint.href).maybeSingle();
   if (existing && existing.user_id !== user.id) return reply({ message: 'Browser ist einem anderen Account zugeordnet. Dort zuerst Push deaktivieren.' }, 409);
   const operation = existing ? admin.from('push_subscriptions').update({ subscription }).eq('endpoint', endpoint.href).eq('user_id', user.id) : admin.from('push_subscriptions').insert({ user_id: user.id, endpoint: endpoint.href, subscription });
   const { error: saveError } = await operation;
   if (saveError) throw saveError;
   return reply({ ok: true });
  }
  return reply({ message: 'Unbekannte Aktion' }, 400);
 } catch (error) {
  console.error('Push-Anfrage fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannt');
  return reply({ message: 'Push-Anfrage konnte nicht verarbeitet werden.' }, 400);
 }
});
async function deliver(admin: ReturnType<typeof createClient>, config: { publicKey: string; privateKey: string }) {
 const { data: subscriptions, error: subscriptionsError } = await admin.from('push_subscriptions').select('*,profiles!inner(active)').eq('profiles.active', true).limit(100);
 if (subscriptionsError) throw subscriptionsError;
 if (!subscriptions?.length) return { sent: 0 };
 const after = new Date(Date.now() - 86400000).toISOString();
 const { data: records, error } = await admin.from('clan_records').select('*').in('kind', ['chat', 'message', 'task', 'loan', 'raid', 'timer', 'notification']).gte('created_at', after).order('created_at', { ascending: false }).limit(500);
 if (error) throw error;
 // Timers created earlier may still be due today.
 const { data: dated } = await admin.from('clan_records').select('*').in('kind', ['task', 'loan', 'raid', 'timer']).gte('data->>due', new Date(Date.now() - 300000).toISOString().slice(0, 16)).limit(500);
 const unique = new Map([...(records || []), ...(dated || [])].map(r => [r.id, r]));
 let sent = 0;
 for (const subscription of subscriptions) {
  for (const record of unique.values()) {
   if (!record.data.due && new Date(record.created_at) < new Date(subscription.created_at)) continue;
   if (['Erledigt', 'Zurückgegeben', 'Abgeschlossen'].includes(record.data.state)) continue;
   const recipient = record.kind === 'message' || record.kind === 'notification' ? record.recipient_id : record.kind === 'timer' ? record.owner_id : record.data.assignee;
   if (record.kind === 'chat' ? record.owner_id === subscription.user_id : recipient !== subscription.user_id) continue;
   let stage = 'neu';
   let message = 'Es gibt einen neuen Eintrag für dich.';
   const isMessage = ['chat', 'message'].includes(record.kind);
   if (isMessage) {
    const { data: read } = await admin.from('message_receipts').select('user_id').eq('record_id', record.id).eq('user_id', subscription.user_id).maybeSingle();
    if (read) continue;
    message = record.kind === 'message' ? 'Du hast eine neue private Nachricht.' : 'Es gibt eine neue Nachricht im Clan-Chat.';
   } else if (record.data.due) {
    const minutes = (new Date(record.data.due).getTime() - Date.now()) / 60000;
    if (minutes < -5 || minutes > 60) continue;
    stage = minutes > 30 ? '60min' : minutes > 0 ? '30min' : 'faellig';
    message = stage === 'faellig' ? 'Ein Termin oder Timer ist jetzt fällig.' : 'Ein Termin oder Timer steht bald an.';
   }
   const { data: claimed, error: claimError } = await admin.rpc('claim_push_delivery', { sub: subscription.id, rec: record.id, stage });
   if (claimError || !claimed) continue;
   const page = record.kind === 'chat' ? 'Clan-Chat' : record.kind === 'message' ? 'Private Nachrichten' : 'Benachrichtigungen';
   try {
    await webpush.sendNotification(subscription.subscription, JSON.stringify({ title: 'SICK CLAN', body: message, url: '/Sick-Clan-RR/#' + encodeURIComponent(page), tag: record.id + '-' + stage }), { vapidDetails: { subject: 'https://ybiene.github.io/Sick-Clan-RR/', publicKey: config.publicKey, privateKey: config.privateKey }, TTL: 3600, timeout: 5000 });
    await admin.from('push_deliveries').update({ sent_at: new Date().toISOString() }).eq('subscription_id', subscription.id).eq('record_id', record.id).eq('event', stage);
    sent++;
   } catch (error) {
    if ([404, 410].includes(error.statusCode)) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
   }
   if (sent >= 30) return { sent, more: true };
  }
 }
 await admin.from('push_deliveries').delete().lt('created_at', new Date(Date.now() - 2592000000).toISOString());
 return { sent };
}
