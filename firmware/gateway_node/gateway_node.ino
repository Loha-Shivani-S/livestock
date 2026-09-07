/*
 * PashuRakshak — Village Base Station / Gateway (Receiver Node)
 * Board  : ESP32 (Wi-Fi) with SX1278 LoRa receiver
 * Uplink : HTTPS POST to the PashuRakshak ingest endpoint
 *
 * Receives CSV frames from collars, converts them to JSON and forwards them.
 * Frames that fail to upload are buffered in RAM and retried, so a village
 * with intermittent connectivity does not lose packets.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <LoRa.h>

#define WIFI_SSID     "village-wifi"
#define WIFI_PASSWORD "change-me"

// Stable project URLs (do not change when the project is renamed)
#define INGEST_URL    "https://project--6578632e-13d0-4a37-91fc-d76786d2034e.lovable.app/api/public/ingest"
#define HEARTBEAT_URL "https://project--6578632e-13d0-4a37-91fc-d76786d2034e.lovable.app/api/public/gateway-heartbeat"

// Paste the value of INGEST_DEVICE_KEY shown on the Collars & gateways screen.
#define DEVICE_KEY    "PASTE_INGEST_DEVICE_KEY_HERE"
#define NODE_ID       "GW-02"

#define LORA_SS   5
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_FREQ 433E6

#define QUEUE_SIZE 40
String queueBuf[QUEUE_SIZE];
int queueLen = 0;
unsigned long lastHeartbeat = 0;

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000UL) delay(400);
}

bool postJson(const char *url, const String &json) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  int code = http.POST(json);
  String body = http.getString();
  http.end();
  Serial.printf("POST %s -> %d %s\n", url, code, body.c_str());
  return code >= 200 && code < 300;
}

String frameToJson(const String &frame) {
  String parts[9];
  int idx = 0, from = 0;
  for (int i = 0; i <= frame.length() && idx < 9; i++) {
    if (i == frame.length() || frame[i] == ',') {
      parts[idx++] = frame.substring(from, i);
      from = i + 1;
    }
  }
  if (idx < 9) return "";

  String json = "{";
  json += "\"node_id\":\"" NODE_ID "\",";
  json += "\"tag_id\":\"" + parts[0] + "\",";
  json += "\"temp\":" + parts[1] + ",";
  json += "\"heart_rate\":" + parts[2] + ",";
  json += "\"ax\":" + parts[3] + ",\"ay\":" + parts[4] + ",\"az\":" + parts[5] + ",";
  if (parts[6].toDouble() != 0.0) {
    json += "\"lat\":" + parts[6] + ",\"lon\":" + parts[7] + ",";
  }
  json += "\"speed\":" + parts[8];
  json += "}";
  return json;
}

void enqueue(const String &json) {
  if (queueLen < QUEUE_SIZE) queueBuf[queueLen++] = json;
}

void drainQueue() {
  while (queueLen > 0) {
    if (!postJson(INGEST_URL, queueBuf[0])) return;
    for (int i = 1; i < queueLen; i++) queueBuf[i - 1] = queueBuf[i];
    queueLen--;
  }
}

void setup() {
  Serial.begin(115200);
  connectWifi();
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  while (!LoRa.begin(LORA_FREQ)) delay(500);
  LoRa.setSpreadingFactor(10);
  LoRa.enableCrc();
  LoRa.receive();
}

void loop() {
  connectWifi();

  int size = LoRa.parsePacket();
  if (size) {
    String frame = "";
    while (LoRa.available()) frame += (char)LoRa.read();
    frame.trim();
    String json = frameToJson(frame);
    if (json.length()) {
      if (!postJson(INGEST_URL, json)) enqueue(json);
    }
  }

  drainQueue();

  if (millis() - lastHeartbeat > 120000UL) {
    lastHeartbeat = millis();
    String hb = String("{\"node_id\":\"" NODE_ID "\",\"online\":true,\"queued\":") + queueLen + "}";
    postJson(HEARTBEAT_URL, hb);
  }
}
