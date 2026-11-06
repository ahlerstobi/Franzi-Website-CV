# Video Tagging Plattform

Demonstrator für die KI-gestützte Metadaten-Extraktion aus Nachrichtenbeiträgen
(Deutsche Welle). Einfach einen YouTube-Link einfügen und auf **Analysieren** klicken.

## Starten

| System  | So geht's |
| :------ | :-------- |
| Windows | Doppelklick auf **`Start-Windows.bat`** |
| macOS   | Doppelklick auf **`Start-Mac.command`**. Beim ersten Mal: Rechtsklick → **Öffnen** → **Öffnen** bestätigen. |
| Linux   | Im Terminal `./Start-Linux.sh` ausführen |

Der Browser öffnet sich danach automatisch unter `http://localhost:8080`.
Ist der Port belegt, wird automatisch der nächste freie verwendet (8081, 8082 …).
**Das schwarze Fenster (Konsole) während der Vorführung offen lassen.** Wird es geschlossen,
stoppt die Plattform.

Es muss nichts installiert werden. Windows nutzt die eingebaute PowerShell, macOS und Linux nutzen
Python 3 (falls nicht vorhanden: Node.js; sonst wird die Seite direkt als Datei geöffnet).

> **Warum nicht einfach `index.html` doppelklicken?** Die Seite funktioniert auch so, aber
> YouTube spielt eingebettete Videos auf lokal geöffneten Dateien (`file://`) oft nicht ab.
> Die Startskripte umgehen das mit einem kleinen lokalen Webserver.

## Demo-Modus vs. Live-Modus

- **Demo-Modus** (Standard, ohne API-Key): Nach einer kurzen Fortschrittsanzeige erscheint das
  vorhandene Gemini-Ergebnis zum DW-Beitrag *Fokus Europa – Tarent / Ilva-Stahlwerk*.
  Das Ergebnis ist **immer dasselbe**, egal welcher Link eingegeben wird. Für die Vorführung
  daher genau diesen Beitrag verwenden.
- **Live-Modus** (mit Gemini-API-Key): Das Video wird tatsächlich von Google Gemini analysiert.
  Dauer je nach Videolänge ca. 30–90 Sekunden. Das Video muss auf YouTube **öffentlich** sein.

## Konfiguration (`config.js`)

`config.js` mit einem Texteditor (z. B. Notepad / TextEdit) öffnen:

```js
window.VTP_CONFIG = {
  GEMINI_API_KEY: "",              // API-Key eintragen → Live-Modus
  GEMINI_MODEL: "gemini-2.5-pro",  // Modellname, ggf. anpassen
  DEMO_VIDEO_URL: ""               // Link, der beim Start schon eingetragen ist
};
```

Einen API-Key gibt es unter <https://aistudio.google.com/apikey>.
Key und Modell lassen sich alternativ auch direkt auf der Seite unter **⚙ Einstellungen** eintragen.

> ⚠️ Der API-Key wird im Browser verwendet. Das ist für einen Demonstrator in Ordnung,
> `config.js` mit eingetragenem Key aber nicht weitergeben oder öffentlich hochladen.

## Ordnerstruktur

```
video-tagging-plattform/
├── Start-Windows.bat        ← Start unter Windows
├── Start-Mac.command        ← Start unter macOS
├── Start-Linux.sh           ← Start unter Linux
├── index.html               ← die Seite
├── config.js                ← API-Key, Modell, Demo-Link
├── README.md                ← diese Anleitung
├── assets/
│   ├── css/style.css        ← Gestaltung
│   ├── img/dw-logo.png      ← DW-Logo
│   └── js/
│       ├── app.js           ← Logik (YouTube, Gemini-Aufruf, Tabellen, Export)
│       └── sample-data.js   ← Beispielergebnis für den Demo-Modus
└── scripts/
    ├── server.ps1           ← lokaler Webserver für Windows
    └── start.sh             ← lokaler Webserver für macOS / Linux
```

## Funktionen

- YouTube-Link einfügen (watch, youtu.be, Shorts, Embed), Video wird eingebettet
- Überblick: Titel, Thema, Zusammenfassung, Schlagworte
- Tabellen: Sendedaten · Personen · Zitate (O-Töne) · Text im Bild (OCR) · JSON
- Export: JSON kopieren / herunterladen, Personenliste als CSV (Excel)
