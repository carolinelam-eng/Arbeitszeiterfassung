# Arbeitszeit Terminal – Design

## Ziel
Eigenständige PWA zur zentralen Arbeitszeiterfassung auf einem dedizierten Terminal.

## Architektur
React + TypeScript + Vite. Lokale Persistenz über IndexedDB (Dexie). Keine Serverabhängigkeit. Rollen: Mitarbeiter ohne Login, Admin mit PIN.

## Kernfunktionen
- Startseite mit Mitarbeiter-Kacheln
- Kontextabhängige Aktionen: Arbeitsbeginn, Pause starten, Pause beenden, Arbeitsende
- Automatischer Rücksprung nach Buchung
- Persönliche Übersicht mit Tages-/Wochen-Soll-Ist
- Admin-Dashboard mit PIN
- Mitarbeiter anlegen, bearbeiten, deaktivieren
- Zeitbuchungen anlegen, ändern, löschen
- CSV-Monatsübersicht je Mitarbeiter, Monat und Jahr
- Mehrere Arbeitsblöcke pro Tag möglich

## Datenmodell
employees: id, name, dailyTargetMinutes, weeklyTargetMinutes, active, sortOrder
entries: id, employeeId, type, timestamp, edited, editedAt
settings: adminPin, resetSeconds, companyName

## Design
Salbei #B8C5BE, heller Hintergrund, weiße Karten, dunkle Schrift, große Touch-Ziele, abgerundete Karten.
