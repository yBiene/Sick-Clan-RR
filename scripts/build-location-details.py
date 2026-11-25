"""German location details from published game data, without executing source JS."""
import json
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://robrun.fun/js/data-start-en.js'
raw=urllib.request.urlopen(SOURCE,timeout=30).read().decode()
source=json.JSONDecoder().raw_decode(raw[raw.index('{'):])[0]
labels={}
for row in '''Alarm panel|Alarmanlage
Alcohol|Alkohol
Alcohol Bottles|Alkoholflaschen
Alcohol Cabinet|Alkoholschrank
Alcohol Cabinet (in a room)|Alkoholschrank im Nebenraum
Alcohol Crate (break open)|Aufbrechbare Alkoholkiste
Alcohol Rack|Alkoholregal
Ammo refill|Munition nachfüllen
Antiques|Antiquitäten
Arsenal grenades|Granaten im Waffenlager
Arsenal pistols|Pistolen im Waffenlager
Arsenal weapons (epic)|Epische Waffen im Waffenlager
Assault rifles in a locked room|Sturmgewehre im verschlossenen Raum
BIG EGG #53|BIG EGG Nr. 53
Bank Money Bag|Geldsack der Bank
Bank safe|Banktresor
Bank vault door|Tür zum Banktresor
Banker (cash withdrawal)|Bankier · Geld abheben
Body armor|Schutzwesten
Box|Kiste
Built-in safe|Eingebauter Tresor
Buletti Soltempra — exhibition car|Buletti Soltempra · Ausstellungsfahrzeug
Bundles|Bündel
Cabinet|Schrank
Cash|Bargeld
Cash Pile|Bargeldstapel
Cashbox|Geldkassette
Cigars|Zigarren
Cigars (room)|Zigarren im Nebenraum
DP9 pistol|DP9-Pistole
Deposit Box|Bankschließfach
Dresser|Kommode
Drug bundles|Drogenbündel
Electronics Display|Elektronikauslage
Electronics Table|Elektroniktisch
Figurines|Figuren
Figurines (in a room)|Figuren im Nebenraum
Fridge|Kühlschrank
Game consoles|Spielkonsolen
Gold Pile|Goldstapel
Gold bars|Goldbarren
Grenades|Granaten
Hair dryer|Haartrockner
Holding cell|Arrestzelle
Hotel cupboard|Hotelschrank
Interactive doors|Interaktive Türen
Jewelry|Schmuck
Jewelry on busts|Schmuck an Büsten
Kitchen cabinet|Küchenschrank
Laptops|Laptops
Legendary police weapons|Legendäre Polizeiwaffen
Locked door — can be picked|Mit Dietrich zu öffnende Tür
Locked door — key required|Tür mit Schlüsselzugang
Medications|Medikamente
Medications Rack (in a room)|Medikamentenregal im Nebenraum
Medicine Cabinet|Medikamentenschrank
Metal detector|Metalldetektor
Mini-market back room|Nebenraum des Minimarkts
Munition|Ausrüstung
Munition Rack (in a room)|Ausrüstungsregal im Nebenraum
Office desk|Schreibtisch
Paintings|Gemälde
Paintings (cheap)|Einfache Gemälde
Paintings in a locked room|Gemälde im verschlossenen Raum
Phones|Telefone
Phones on a stand|Telefone am Aufsteller
Pistols in a locked room|Pistolen im verschlossenen Raum
Poker room cupboard|Schrank im Pokerraum
Police weapons|Polizeiwaffen
Premium alcohol (room)|Hochwertiger Alkohol im Nebenraum
Relic weapons|Reliktwaffen
SMGs (epic) in a locked room|Epische Maschinenpistolen im verschlossenen Raum
SMGs in a locked room|Maschinenpistolen im verschlossenen Raum
Safe|Tresor
Secured Computer|Gesicherter Computer
Security camera|Überwachungskamera
Shotguns (epic) in a locked room|Epische Schrotflinten im verschlossenen Raum
Shotguns in a locked room|Schrotflinten im verschlossenen Raum
Spare Parts|Ersatzteile
Spare Parts (in a room)|Ersatzteile im Nebenraum
Spare Parts Rack|Ersatzteilregal
Substances|Substanzen
Substances (in a room)|Substanzen im Nebenraum
Substances Rack|Substanzenregal
Substances Rack (in a room)|Substanzenregal im Nebenraum
Toasters|Toaster
Weapon Parts Box|Kiste mit Waffenteilen
Weapon cabinet|Waffenschrank
Weapons (common)|Gewöhnliche Waffen
Weapons on display|Waffenauslage
Weapons on display (basic)|Einfache Waffenauslage'''.splitlines():
 a,b=row.split('|');labels[a]=b
key_desc={
'vip_key_1':'Öffnet das geheime Lager im Grand Hotel in Sunny Beach.',
'vip_key_2':'Öffnet die Gittertür zum Kellerabgang in der Polizeiwache.',
'vip_key_3':'Öffnet einen verschlossenen Raum in einem Landhaus in Loraine Hills.',
'vip_key_4':'Öffnet die Waffenkammer der Polizeiwache. Bei Lenny an der verdächtigen Tür seines Motels gegen Beweismaterial eintauschbar.',
'vip_key_5':'Öffnet den Goldtresor in der Bank.',
'vip_key_6':'Öffnet den Tresorraum der Kunstgalerie.',
'room_key_1':'Öffnet den verschlossenen Raum im Waffenladen in Sunny Beach.',
'room_key_2':'Öffnet den verschlossenen Raum im Ausrüstungsladen in Sunny Beach.',
'room_key_3':'Öffnet den verschlossenen Raum im Waffenladen in Downtown.',
'room_key_4':'Öffnet den verschlossenen Raum im Ausrüstungsladen in Downtown.',
'room_key_5':'Öffnet den linken Geheimraum der Tankstelle in Downtown.',
'room_key_6':'Öffnet den rechten Geheimraum der Tankstelle in Downtown.',
'room_key_7':'Öffnet einen verschlossenen Raum in einem Landhaus in Loraine Hills.',
'room_key_8':'Öffnet den verschlossenen Raum in der Apotheke in Downtown.',
'room_key_9':'Öffnet den verschlossenen Raum in der Apotheke in Sunny Beach.',
'room_key_10':'Öffnet den verschlossenen Raum im Minimarkt in Downtown.',
'room_key_11':'Öffnet den verschlossenen Raum im Minimarkt in Sunny Beach.',
'room_key_12':'Öffnet einen verschlossenen Raum in einem Hotel in Sunny Beach.',
'room_key_13':'Öffnet den VIP-Raum im Stripclub.',
}
safes={1:'Seasons Hotel in Sunny Beach',2:'Reef Hotel in Sunny Beach',3:'Stripclub',4:'Minimarkt im Norden von Downtown',5:'Apotheke in Sunny Beach',6:'Café am Pier in Sunny Beach',7:'der Villa in Loraine Hills',8:'Minimarkt im Zentrum von Downtown',9:'Minimarkt in Sunny Beach',10:'Apotheke in Downtown',11:'Café in Downtown',12:'Tankstelle in Downtown',13:'Elektronikgeschäft in Sunny Beach',14:'einem Landhaus in Loraine Hills'}
for n,place in safes.items():key_desc[f'safe_key_{n}']=f'Öffnet den Tresor bei {place}.'
keys=json.loads((ROOT/'data/robbery-keys.json').read_text())
for key in keys:
 key['description']=key_desc[key['id']]
 key['kind']='room_key' if key['id']=='vip_key_2' else 'safe_key' if key['id'].startswith('safe_') else 'room_key' if key['id'].startswith('room_') else 'keycard'
 if key['id']=='vip_key_2':key['name']='Kellerschlüssel Nr. 2'
(ROOT/'data/robbery-keys.json').write_text(json.dumps(keys,ensure_ascii=False,indent=2)+'\n')
result={}
for building in source['buildings']:
 tools=[]
 if building.get('summary',{}).get('door',{}).get('Locked door — can be picked'):
  tools.append({'id':'lockpick_1','purpose':'Für die im Datensatz als mit Dietrich zu öffnen markierten Türen.'})
 if building['id']=='Bank':tools.append({'id':'drill_1','purpose':'Zum Aufbohren von Banktresoren. Laut Gegenstandsbeschreibung laut und zeitaufwendig.'})
 groups={}
 for group,entries in building.get('summary',{}).items():
  groups[group]=[]
  for label,count in entries.items():
   if label not in labels:raise ValueError('Missing German label: '+label)
   groups[group].append({'label':labels[label],'count':count})
 result[building['id']]={'summary':groups,'tools':tools,'source':SOURCE,'floors':building.get('floors',[])}
(ROOT/'data/location-details.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Deutsche Ortsdetails:',len(result),'Schlüssel:',len(keys))
