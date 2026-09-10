# Arbeitszeit Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine eigenständige, lokal laufende PWA für Arbeitszeiterfassung mit Mitarbeiterterminal, Auswertungen, Admin-Verwaltung und CSV-Export.

**Architecture:** React/TypeScript SPA mit IndexedDB-Persistenz via Dexie. Domänenlogik wird in testbaren Utility-Modulen gehalten; UI greift über Hooks auf die Datenbank zu.

**Tech Stack:** React 18, TypeScript, Vite, Dexie, React Router, Vitest

**Spec:** `docs/superpowers/specs/2026-09-10-arbeitszeit-terminal-design.md`

## Global Constraints
- Primärfarbe #B8C5BE
- Keine Serverabhängigkeit
- Keine Korrekturen durch Mitarbeiter
- Mehrere Arbeitsblöcke pro Tag zulassen
- Adminbereich per PIN schützen

---

### Task 1: Projektgerüst und Datenmodell
- [ ] Vite/React/TypeScript konfigurieren
- [ ] Dexie-Datenbank und Typen anlegen
- [ ] Beispieldaten initialisieren
- [ ] Build prüfen

### Task 2: Zeitlogik
- [ ] Statusableitung aus Buchungen implementieren
- [ ] Arbeits- und Pausendauer berechnen
- [ ] Soll-Ist-Berechnung implementieren
- [ ] Unit-Tests ausführen

### Task 3: Terminal-UI
- [ ] Mitarbeiterauswahl als Kacheln
- [ ] Aktionspanel statusabhängig
- [ ] automatische Rückkehr nach Buchung
- [ ] persönliche Übersicht

### Task 4: Admin
- [ ] PIN-Sperre
- [ ] Mitarbeiterverwaltung
- [ ] Zeitbuchungen nach Datum/Mitarbeiter bearbeiten, ergänzen und löschen
- [ ] Monatsfilter

### Task 5: Export und PWA
- [ ] CSV-Monatsübersicht je Mitarbeiter erzeugen
- [ ] Manifest und installierbare PWA konfigurieren
- [ ] Responsive Layout prüfen
- [ ] Produktionsbuild und Tests ausführen
