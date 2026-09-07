/*
 * HerdSentinel — Multi-Species Wearable Collar (Transmitter Node)
 * Board : Arduino Nano
 * Radio : SX1278 LoRa (433 MHz)
 * Sensors: MPU6050 (VeDBA), DS18B20 (body temperature), MAX30102/KY-039 (pulse), NEO-6M (GPS)
 *
 * Sends one compact CSV frame per interval to the village gateway:
 *   TAG,temp,hr,ax,ay,az,lat,lon,speed
 * The gateway converts it to JSON and POSTs it to /api/public/ingest.
 */

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <TinyGPSPlus.h>
#include <SoftwareSerial.h>

#define TAG_ID        "IN-MH-2031-4471"   // ear tag printed on the animal
#define LORA_SS       10
#define LORA_RST      9
#define LORA_DIO0     2
#define LORA_FREQ     433E6
#define ONE_WIRE_PIN  4
#define PULSE_PIN     A0
#define TX_INTERVAL   60000UL             // 60 s; raise to save battery

OneWire oneWire(ONE_WIRE_PIN);
DallasTemperature tempSensor(&oneWire);
TinyGPSPlus gps;
SoftwareSerial gpsSerial(3, 5);           // RX, TX

const int MPU_ADDR = 0x68;
unsigned long lastTx = 0;

void mpuBegin() {
  Wire.begin();
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);
}

void mpuRead(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);
  int16_t rx = Wire.read() << 8 | Wire.read();
  int16_t ry = Wire.read() << 8 | Wire.read();
  int16_t rz = Wire.read() << 8 | Wire.read();
  ax = rx / 16384.0;
  ay = ry / 16384.0;
  az = rz / 16384.0;
}

int readHeartRate() {
  // Peak counting over a 5 s window on the analogue pulse sensor.
  unsigned long start = millis();
  int beats = 0, last = 0;
  bool above = false;
  while (millis() - start < 5000UL) {
    int v = analogRead(PULSE_PIN);
    if (!above && v > last + 40) { beats++; above = true; }
    if (above && v < last - 40) { above = false; }
    last = v;
    delay(5);
  }
  return beats * 12;   // 5 s window -> beats per minute
}

void setup() {
  Serial.begin(9600);
  gpsSerial.begin(9600);
  tempSensor.begin();
  mpuBegin();

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  while (!LoRa.begin(LORA_FREQ)) { delay(500); }
  LoRa.setSpreadingFactor(10);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setTxPower(20);
  LoRa.enableCrc();
}

void loop() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());

  if (millis() - lastTx < TX_INTERVAL) return;
  lastTx = millis();

  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);

  float ax, ay, az;
  mpuRead(ax, ay, az);
  int hr = readHeartRate();

  double lat = gps.location.isValid() ? gps.location.lat() : 0.0;
  double lon = gps.location.isValid() ? gps.location.lng() : 0.0;
  double kmh = gps.speed.isValid() ? gps.speed.kmph() : 0.0;

  String frame = String(TAG_ID) + "," + String(tempC, 2) + "," + String(hr) + "," +
                 String(ax, 3) + "," + String(ay, 3) + "," + String(az, 3) + "," +
                 String(lat, 6) + "," + String(lon, 6) + "," + String(kmh, 2);

  LoRa.beginPacket();
  LoRa.print(frame);
  LoRa.endPacket();
  Serial.println(frame);
}
