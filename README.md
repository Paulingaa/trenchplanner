# TrenchPlanner Pro (Ringgrabenkollektor - RGK)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![VDI 4640 Blatt 2](https://img.shields.io/badge/Standard-VDI%204640-green.svg)](https://www.vdi.de)
[![Built with React & Vite](https://img.shields.io/badge/Built%20with-React%20%2B%20Vite%20%2B%20Tailwind-sky.svg)](https://vitejs.dev)

> Modernes, browserbasiertes CAD- & Dimensionierungstool für oberflächennahe Erdwärme-Ringgrabenkollektoren (RGK) nach **VDI 4640 Blatt 2** und **DIN 4124**.

---

## 🌟 Highlights & Funktionen

- **📐 Interaktives 2D CAD:**
  - Vektorbasierter Planer mit Pan, Zoom, Maßstab und Raster-Fang (0.1m, 0.5m, 1.0m).
  - Grundstücksgrenzen mit Grenzabstandslinien (Grenzabstand nach Landesbauordnung).
  - Gebäude, Garagen, Terrassen sowie Hindernisse (Zisternen, Baumschutzbereiche mit Wurzelradius).
  - Mehrteilige Grabenführung mit automatischer Überlappungs-Berechnung und realistischer Slinky-Schlaufengeometrie.
  - Farbcodierter thermischer Verlauf (Kalt-Zulauf in Eisblau $-1.5^\circ\text{C}$ bis Warm-Rücklauf in Koralle $+3.5^\circ\text{C}$).

- **🌡️ Thermische & Hydraulische Simulation (VDI 4640):**
  - Klimadatenbank mit Norm-Außentemperaturen nach DIN EN 12831.
  - Bodenarten (Trockener Sand, Lehmiger Sand, Feuchter Lehm, Ton, Wasserführend).
  - Berechnung der Kälteleistung $Q_0 = Q_{\text{total}} \times (1 - 1/\text{COP})$ und jährlicher Entzugsenergie ($kWh/a$).
  - Hydraulik-Berechnung: Strömungsgeschwindigkeit, Reynolds-Zahl ($Re$) für laminare/turbulente Strömung, Druckverlust (kPa/mbar) und Pumpenförderhöhe (mWS).

- **🛠️ Spezial-Werkzeuge:**
  - **Grabenquerschnitt & Isothermen:** 2D-Profil mit Böschungswinkel nach DIN 4124, Sandbettung, PE 100-RC Rohr, Trassenwarnband bei $-0.50\text{m}$ und Erdwärme-Isothermen.
  - **Hydraulik-Check:** Interaktive Temperatur- und Viskositätsanalyse (Monopropylenglykol 20–30%) von $-6^\circ\text{C}$ bis $+10^\circ\text{C}$.
  - **Stückliste & Kostenvergleich:** Aushubvolumen ($m^3$), Sandmenge, Glykol-Bedarf und Gegenüberstellung von Eigenleistung (DIY) vs. Erdsondenbohrung (Ersparnis ca. €11.000).
  - **PDF-Auslegungsbericht:** Druckfertiger DIN A4 Querformat-Bericht nach VDI 4640 mit hochauflösendem Lageplan-Ausschnitt.
  - **URL-Sharing:** Vollständige Projektteilung über komprimierten URL-Hash (LZ-String) ohne Serverzwang.

---

## 🚀 Schnellstart lokal

```bash
# Repository klonen
git clone https://github.com/<DEIN-BENUTZERNAME>/trenchplanner.git
cd trenchplanner

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Der Server startet unter `http://localhost:3000`.

---

## 📦 Produktions-Build

```bash
npm run build
```
Erzeugt die statischen Produktions-Assets im Ordner `dist/`.

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert.
