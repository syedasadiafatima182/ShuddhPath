# ShuddhPath

> **Hyperlocal respiratory exposure minimization and urban flood hazard routing for two-wheeler commuters.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda%20Serverless-FF9900?logo=awslambda&logoColor=white)](https://aws.amazon.com/lambda/)
[![AWS SAM](https://img.shields.io/badge/AWS-SAM%20Local-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/serverless/sam/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev)
[![Leaflet Maps](https://img.shields.io/badge/Maps-Leaflet%201.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Copernicus CAMS](https://img.shields.io/badge/Air%20Quality-Copernicus%20CAMS-0284c7)](https://atmosphere.copernicus.eu/)
[![ECMWF Rain](https://img.shields.io/badge/Precipitation-ECMWF%20Forecast-0284c7)](https://open-meteo.com)
[![OSRM Graphs](https://img.shields.io/badge/Routing-OpenStreetMap%20OSRM-10b981)](https://project-osrm.org)
[![Nominatim](https://img.shields.io/badge/Geocoding-OSM%20Nominatim-10b981)](https://nominatim.org)
---

## Overview

Two-wheeler commuters in dense metropolitan areas inhale up to 60% of their daily fine particulate burden ($\text{PM}_{2.5}$) while stationary at congested intersections and enclosed underpass bottlenecks. Standard commercial routing engines optimize purely for transit distance or passenger-car velocity, frequently steering unprotected riders into peak diesel exhaust zones and flood-prone railway underpasses during precipitation events.

**ShuddhPath** evaluates real-time atmospheric particulate density, precipitation telemetry, and road network topologies to compute alternative transit corridors that minimize cumulative respiratory dosage without introducing impractical travel delays.

---

## System Architecture



```text
[ OpenStreetMap Nominatim ] ──> Geocoding & Coordinate Resolution
[ Open-Meteo API ]         ──> Live PM2.5 (Copernicus) & Precipitation Telemetry
[ Project OSRM ]           ──> Real-time Road Topology & Waypoint Traversal
                                       │
                                       ▼
                     [ Python Serverless Gateway ]
                         (lambda_handler.py / server.py)
                                       │
              ┌────────────────────────┴────────────────────────┐
              ▼                                                 ▼
   [ Exposure Dose Engine ]                          [ Corridor Hazard Model ]
   Inhaled PM2.5 calculation                         Underpass submergence scoring
   via minute ventilation volume                     & traffic stall multipliers
              └────────────────────────┬────────────────────────┘
                                       │ JSON Response
                                       ▼
                       [ React + Vite Client ]
                       Dynamic Polyline Rendering
                       Interactive Stress-Test Controls

```
## 🛠️ Complete Technical Stack

| Domain | Technology / Service | Role in ShuddhPath |
| :--- | :--- | :--- |
| **Cloud & Compute** | **AWS Lambda** | Stateless event execution for intake dose and flood risk scoring |
| **Serverless Dev** | **AWS SAM / Local Gateway** | API Gateway emulation and local HTTP routing bridge (`server.py`) |
| **Air Quality Telemetry** | **Open-Meteo & Copernicus CAMS** | Real-time hourly $\text{PM}_{2.5}$ particulate density ($\mu\text{g}/\text{m}^3$) |
| **Hydro Telemetry** | **ECMWF Precipitation Model** | Continuous precipitation rate ($\text{mm}/\text{h}$) for dynamic flood alerts |
| **Road Graph & Routing** | **Project OSRM** | Polyline generation, waypoint distance, and driving durations |
| **Geocoding** | **OpenStreetMap Nominatim** | Autonomous text-to-coordinate query resolution |
| **User Interface** | **React 18 + Vite** | Component tree, live reactive state, and hazard stress-test triggers |
| **Geospatial Rendering** | **Leaflet 1.9** | Multi-polyline rendering, custom hazard divIcons, and map bounds fitting |
| **Client Geolocation** | **W3C Geolocation API** | Native single-click device GPS coordinate acquisition |