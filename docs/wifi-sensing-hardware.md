# Hardware Integration Notes

The first prototype is CSI-first and hardware-replaceable.

## Supported target classes

- ESP32 CSI firmware that emits subcarrier CSI over serial.
- Raspberry Pi with compatible monitor-mode/CSI-capable Wi-Fi hardware.
- Linux Wi-Fi adapter supported by a CSI extraction tool.

## JSONL adapter contract

For fastest integration, bridge your hardware tool into JSON Lines and run the backend with `CSI_DEVICE_MODE=jsonl`:

```json
{"device_id":"esp32-1","room_id":"lab-1","amplitude":[42.1,41.8,40.9],"phase":[0.1,0.2,0.18],"rssi":-51}
```

`amplitude` and `phase` are required. `rssi` is optional metadata and is not the basis of the detector.

## Replacing the simulator

Implement `CSICollector` in `backend/csi/interface.py` for serial, socket, or driver-specific input. Keep all hardware-specific code in `backend/csi` so preprocessing, ML, APIs, and clients do not change.
