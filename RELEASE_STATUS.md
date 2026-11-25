# Sick-Clan-RR 0.3

Stand 25. November 2026

## Veröffentlichung und Daten

Die Clan-Zentrale verwendet GitHub Pages und das vorhandene Supabase-Projekt `piklnvlswdwxpmnpliwn` im kostenlosen Tarif. Der Eigentümeraccount yBiene bleibt erhalten. Die Anmeldung und Accountverwaltung verwenden Benutzernamen und Passwörter mit internen technischen Accountadressen.

Der Katalog umfasst 563 Quellen-Datensätze. Ein ausdrücklich unbekannter technischer Eintrag wird in der Spieleransicht ausgeblendet. 473 Gegenstandsnamen wurden übersetzt. Die übrigen Namen sind Modell-, Marken- oder Personennamen beziehungsweise identische deutsche Wörter. Kategorien, Seltenheiten, Fundorte, 171 Forschungsfreischaltungen und elf Tauschrezepte sind deutsch. Originalnamen bleiben als Referenz erhalten. Preise, numerische Spielwerte, IDs, Bildzuordnungen und Quellen wurden unverändert geprüft.

457 Original-Spielicons werden lokal ausgeliefert. Technische Freischaltungen, Statistiken und einige Weltobjekte besitzen in der Quelle kein eigenes Inventaricon. Die Weltkarte verwendet einen offiziellen Steam-Screenshot von Kefir. Ursprüngliche Ortsbilder und die Forschungsübersicht aus der vorhandenen Arbeitsmappe sind weiter eingebunden.

## Funktionen

- Profile, Basisdaten, Inventar, Wunschlisten und Clanmitglieder.
- Pflanzenrechner mit mehreren Anbautischen, Pflanzenraritäten, individueller Ausrüstung, Käuferstufe, Ernteintervall und eigenen gemessenen Zykluszeiten. Ältere gespeicherte Pflanzendaten werden weiter unterstützt.
- Grafischer Forschungsbaum mit 171 Freischaltungen, 142 echten Voraussetzungen und persönlichem beziehungsweise gemeinsamem Fortschritt.
- Interaktive interne Weltkarte und Stadtansicht mit 29 Gebäuden und 144 Fundorten oder Diensten. Suche, Filter, Verschieben, Zoom, Tastatursteuerung, Beute- und Schlüsselangaben.
- Lager mit Mindestbeständen, Kasse, Aufgaben, Brett, Ziele, Spezialisierungen und Fuhrpark.
- Gruppenchat und private Nachrichten mit automatischer Aktualisierung, Bildnachrichten und Lesebestätigungen. Private Bilder sind ausschließlich für Beteiligte zugänglich. Bilder bis 1 MB und insgesamt 256 Bilder im Clan-Bucket begrenzen den Speicherbedarf.
- Handelsplatz, Leihen, Überfallplanung, Timer, Preisvergleich, Herstellungs- und Beuterechner.
- Globale Suche mit deutschen und ursprünglichen Spielnamen, quellengebundene Spielwertkorrekturen und Änderungsprotokoll.
- Serverseitige Accountanlage, Rollenverwaltung, Sperrung, Passwortzurücksetzung und Kopieren neu angelegter Zugangsdaten.
- JSON-Sicherung einschließlich zugänglicher Bilder. Leitung kann gemeinsame Claneinträge mit ursprünglichen Eigentümern wiederherstellen. Private Nachrichten bleiben ihren jeweiligen Eigentümern vorbehalten. Datenbankimport erfolgt atomar und überspringt vorhandene IDs.
- Web Push für neue Nachrichten und Termin-/Timerhinweise auch bei geschlossener Seite. Aktivierung erfolgt bewusst pro Browser. Auf iOS ist die installierte Home-Bildschirm-Web-App erforderlich. Versand wird im bestehenden Supabase-Projekt zeitgesteuert ausgeführt.

## Prüfstand

Die Backend-Prüfung umfasst Anmeldung, Accountanlage, Rollenrechte, CRUD in sämtlichen 20 Mitgliedsmodulen, alle drei Leitungsmodulen, Schutz privater Nachrichten und Bilder, Lesebestätigungen, Wiederherstellung ursprünglicher Eigentümer, wiederholten Import, Sperrung und Push-Authentifizierung. Zusätzliche Tests prüfen Bildpfadschutz und atomare Rollbacks. Alle 37 Live-Prüfungen haben bestanden.

Alle 45 Ansichten wurden im Browser geöffnet. Alle 45 mobilen Ansichten wurden bei 375 beziehungsweise 390 CSS-Pixeln ohne horizontalen Seitenüberlauf und ohne angezeigte Anwendungsfehler geprüft. Interaktionen für Pflanzenberechnung und Speicherung, mehrere Tische, lange Chatnachrichten, Forschungsfortschritt sowie Kartenfilter und Beutedetails wurden zusätzlich geprüft. Browserprüfungen der angemeldeten Oberfläche verwenden isolierte Testantworten. Die Datenbank- und Rechteprüfungen laufen gesondert gegen das produktive Supabase-Projekt mit temporären Testkonten, die anschließend entfernt werden.

## Quellenentscheidungen und Grenzen

Die Stadtansicht stellt tatsächliche Spielkoordinaten dar. Der verfügbare Datensatz enthält keine nachweislich frei nutzbare vollständige Stadtgrafik oder Straßenverläufe. Die interne Original-Weltkarte und die Koordinatenkarte sind eigenständig bedienbar.

Pflanzenzeiten werden mit der mehrfach als im Spiel gemessen beschriebenen Communityformel berechnet. 60 Minuten Grundzeit geteilt durch die Summe aus 1 und den Ausrüstungsboni ergeben 40 Minuten mit allen drei Upgrades. Eine andere, ausdrücklich ungemessene Interpretation des Spielcodes ergibt 30 Minuten. Eine offizielle Bestätigung fehlt. Eigene Messzeiten können pro Tisch verwendet werden.

Eine tatsächliche Push-Zustellung an ein freigegebenes Endgerät hängt von Browserberechtigung und Pushdienst ab. Die Serverauthentifizierung, Einrichtung, Zugriffsbeschränkungen und Zeitsteuerung sind geprüft. Ohne aktiviertes Browser-Abonnement wird keine Zustellung behauptet.

## Quellen

[ROB RUN Wiki · veröffentlichte Daten](https://robrunwiki.com/en/data/) · [Katalog](https://robrunwiki.com/en/items/) · [Pflanzenmessungen](https://robrunwiki.com/en/tools/farm/) · [Weitere Pflanzenmessungen](https://robrun.fun/en/farm/) · [Koordinatendaten](https://robrun.fun/js/data-start-en.js) · [Offizielles Spielmaterial](https://store.steampowered.com/app/4262460/ROB_RUN/).

Spielmaterial © Kefir. Daten wurden übersetzt und in eine eigene Oberfläche übernommen. Drittanbieter-Kartencode und fremde Websitegestaltung wurden nicht übernommen.
