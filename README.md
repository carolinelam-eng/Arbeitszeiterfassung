# Arbeitszeit Terminal

Eigenständige PWA für ein zentrales Arbeitszeit-Terminal. Die App speichert alle Daten ausschließlich lokal im Browser des Terminal-Geräts (IndexedDB) und benötigt keinen Server.

## Starten

1. Ordner auf den Terminal-Mac/PC kopieren.
2. Im Terminal in diesen Ordner wechseln.
3. `npm run dev` ausführen (alternativ `python3 -m http.server 4173`).
4. Im Browser `http://localhost:4173` öffnen.
5. Auf iPad/iPhone: dieselbe Seite über einen erreichbaren lokalen Webserver öffnen und „Zum Home-Bildschirm“ wählen.

## Erster Start

- Voreingestellte Mitarbeiter: Mareike, Dani, Doriane, Valeriia.
- Sollzeiten sind absichtlich noch nicht festgelegt und können im Adminbereich gepflegt werden.
- Standard-Admin-PIN: `2468`.
- Den PIN direkt unter **Admin → Einstellungen** ändern.

## Funktionen

- Mitarbeiter-Kacheln
- Arbeitsbeginn, Pause starten, Pause beenden, Arbeitsende
- mehrere Arbeitsblöcke pro Tag
- automatischer Rücksprung nach einer Buchung
- persönliche Tages-/Wochenübersicht mit Soll-Ist
- PIN-geschützter Adminbereich
- Buchungen ergänzen, bearbeiten und löschen
- Mitarbeiter anlegen, bearbeiten, deaktivieren
- CSV-Monatsübersicht pro Mitarbeiter
- Offline-PWA nach erstem Laden

## Datensicherung

Die Daten liegen in IndexedDB des verwendeten Browsers. Browserdaten dürfen daher nicht gelöscht werden. Für eine spätere Version ist ein zusätzlicher Backup-/Restore-Export empfehlenswert.
