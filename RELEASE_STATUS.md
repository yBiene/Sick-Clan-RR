# Sick-Clan-RR 0.2

Stand 25. November 2026

## Umgesetzt

45 erreichbare Bereiche mit Datenformularen, Listen, Referenzdaten oder Rechnern. Anmeldung mit Benutzername und Passwort. Serverseitige Anlage, Rollenverwaltung, Sperrung und Passwortzurücksetzung für Clanaccounts. Geschützter Eigentümeraccount yBiene. Profile, Basisdaten, Pflanzenrechner, Forschungsfortschritt, Inventar, Wunschlisten, Clanlager mit Mindestbestand, Kasse, Aufgaben, Brett, Ziele, Spezialisierungen, Fuhrpark, Gruppenchat, private Nachrichten, Terminübersicht, Handel, Leihen, Überfallplanung, Timer, Preisvergleich, Tauschrechner, Beuterechner, globale Suche, Spielwertkorrekturen, JSON-Export und Import eigener Einträge, Änderungsprotokoll.

563 Katalogeinträge, 171 Forschungseinträge und 11 Tauschrezepte aus veröffentlichten ROB-RUN-Spieldaten. 457 lokal gespeicherte Original-Spielicons. Fehlende Icons werden ausgelassen. Originale Ortsausschnitte und Forschungsübersicht aus der bestehenden Arbeitsmappe.

## Prüfungen

- Vorhandener yBiene-Login über Supabase Auth erfolgreich.
- Anonyme Datenabfrage abgewiesen.
- Direkte Rollenänderung über Profil-API abgewiesen.
- Accountanlage über serverseitige Funktion erfolgreich.
- Anmeldung des Testmitglieds erfolgreich.
- Mitglied kann Accountverwaltung und Kassenanlage nicht verwenden.
- Mitglied kann eigene Aufgabe anlegen, aktualisieren und löschen.
- Gesperrtes Mitglied erhält keine Claneinträge.
- Alle 45 Ansichten im Browser mit isolierten Testantworten aufgerufen.
- Pflanzenbeispiel mit sechs grünen Pflanzen, drei Beuteln und allen Upgrades ergibt 40 Minuten und 108.000 $ pro Stunde.
- Mobile Dashboardansicht bei 375 CSS-Pixeln ohne horizontalen Überlauf geprüft.

## Grenzen und Quellenentscheidungen

Die vollständige interaktive Karte wird beim Kartenanbieter geöffnet. Innerhalb der Seite gibt es vergrößerbare originale Ortsausschnitte. Der Skilltree zeigt die 171 Freischaltungen mit persönlichem und gemeinsamem Fortschritt. Eine vollständige grafische Darstellung bestätigter Abhängigkeiten fehlt.

Die Pflanzenzeit verwendet die am 22.11.2026 als im Spiel geprüft beschriebene Formel von ROB RUN Wiki. Eine andere Communityquelle berichtet eine abweichende Formel. Diese Unsicherheit steht im Rechner. Katalogdaten entsprechen dem veröffentlichten Stand 0.7.0, die Spielnamen sind überwiegend die englischen Originalnamen. Eine vollständige deutsche Übersetzung ist offen.

Die Kommunikation wird manuell aktualisiert. Bildnachrichten, Lesebestätigungen und Pushnachrichten bei geschlossener Seite fehlen. Benachrichtigungen zeigen zugewiesene Aufgaben, Leihen und eigene Timer. Der Sicherungsimport stellt eigene Einträge wieder her. Der Export enthält sämtliche für den angemeldeten Account lesbaren Datensätze.

Die Browserprüfung der angemeldeten Ansichten verwendet isolierte Testantworten. Produktive Authentifizierung und Rechte wurden gesondert über die APIs geprüft. Nicht jeder Formularablauf wurde gegen die produktive Datenbank durchgespielt.

## Quellen

[ROB RUN Wiki · veröffentlichte Daten](https://robrunwiki.com/en/data/), [Katalog](https://robrunwiki.com/en/items/), [Pflanzenwerte](https://robrunwiki.com/en/tools/farm/), [Karte](https://robrunwiki.com/en/map/). Spielmaterial © Kefir. Die Daten wurden in eine eigene Darstellung überführt. Fremder Websitecode wurde nicht übernommen.

GitHub Pages und das vorhandene Supabase-Projekt werden weiterverwendet. Es wurden keine kostenpflichtigen Dienste aktiviert. Verfügbarkeit, Tarifbedingungen und Freikontingente werden von den Anbietern bestimmt.
