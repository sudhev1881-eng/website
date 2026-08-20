# Wi-Fi CSI Presence Detection Architecture

## Privacy-first sensing boundary

The system detects occupancy from Wi-Fi Channel State Information (CSI): per-subcarrier amplitude and phase changes caused by people moving through the RF path. It does **not** collect camera footage, audio, GPS location, Bluetooth tracking identifiers, facial information, or personal identity. It reports room occupancy only.

## Prototype data flow

```text
Wi-Fi router / access point
        ↓
CSI-capable device (ESP32, Raspberry Pi + compatible NIC, Linux CSI adapter)
        ↓
CSI collector interface (`backend/csi`)
        ↓
Preprocessing and noise filtering (`backend/signal_processing`)
        ↓
Feature extraction
        ↓
Baseline ML model (`backend/ml`, Random Forest)
        ↓
FastAPI REST + WebSocket API (`backend/main.py`, `backend/api`)
        ↓
Next.js dashboard (`frontend/src/app/wifi-sensing`) and Expo mobile client (`mobile`)
```

## Simulated vs real sensing

- **Simulated prototype:** generates CSI-like amplitude/phase vectors for EMPTY, OCCUPIED, MOTION, and UNSTABLE states. This lets the dashboard and ML pipeline run without hardware.
- **RSSI experiments:** RSSI may be recorded as device metadata, but the prototype does not claim ordinary RSSI reliably detects people.
- **Actual CSI implementation:** adapters should provide amplitude/phase measurements through `CSICollector` or JSON Lines so the signal processing and ML code remains unchanged.

## Status values

- `EMPTY` -> displayed as `ROOM EMPTY`
- `OCCUPIED` -> displayed as `PERSON DETECTED`
- `MOTION_DETECTED`
- `SIGNAL_UNSTABLE`
