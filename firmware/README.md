# PashuRakshak collar & gateway firmware

Two sketches:

| Folder | Board | Job |
| --- | --- | --- |
| `collar_node/` | Arduino Nano + SX1278 + MPU6050 + DS18B20 + pulse sensor + NEO-6M | Reads vitals every 60 s and transmits one LoRa frame |
| `gateway_node/` | ESP32 + SX1278 + Wi-Fi (or SIM800L) | Receives frames, converts to JSON, POSTs to the backend, buffers when offline |

## Wiring (both boards, SX1278)

| SX1278 | Arduino Nano | ESP32 |
| --- | --- | --- |
| NSS | D10 | GPIO5 |
| RST | D9 | GPIO14 |
| DIO0 | D2 | GPIO26 |
| SCK / MISO / MOSI | D13 / D12 / D11 | GPIO18 / GPIO19 / GPIO23 |

Collar sensors: DS18B20 data on D4 (4.7 kΩ pull-up), MPU6050 on A4/A5 (I²C), pulse sensor on A0, NEO-6M on D3 (RX) / D5 (TX). Power: 3×18650 through a buck/boost module supplying 5 V and 3.3 V.

## Before flashing the gateway

1. Open the **Collars & gateways** screen in the app and copy the ingest URL and the device key.
2. In `gateway_node.ino`, set `WIFI_SSID`, `WIFI_PASSWORD`, `DEVICE_KEY` and `NODE_ID` (must match a gateway row in the app).
3. In `collar_node.ino`, set `TAG_ID` to the animal's ear tag as registered in the animal register.

## Packet format

LoRa frame (CSV): `TAG,temp,hr,ax,ay,az,lat,lon,speed`

HTTP body posted by the gateway:

```json
{ "node_id": "GW-02", "tag_id": "IN-MH-2031-4471", "temp": 39.4, "heart_rate": 88,
  "ax": 0.05, "ay": 0.02, "az": 0.98, "lat": 20.3062, "lon": 73.8891, "speed": 0.3 }
```

The endpoint also accepts an array of such objects for batched uploads. Every request must carry the header `x-device-key: <INGEST_DEVICE_KEY>`.
