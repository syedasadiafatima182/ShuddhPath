# ShuddhPath

> **Hyperlocal respiratory exposure minimization and urban flood hazard routing for two-wheeler commuters.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda%20Serverless-FF9900?logo=awslambda&logoColor=white)](https://aws.amazon.com/lambda/)
[![AWS SAM](https://img.shields.io/badge/AWS-SAM%20Local-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/serverless/sam/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet%201.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Open-Meteo](https://img.shields.io/badge/Telemetry-Open--Meteo-orange)](https://open-meteo.com)
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