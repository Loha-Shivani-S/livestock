-- ====================================================================
-- HERDSENTINEL INITIAL SEED DATA
-- Bharat Pashudhan (INAPH) 12-digit RFID livestock tags & sensors
-- ====================================================================

-- 1. Insert Initial Gateways
INSERT INTO public.gateways (node_id, label, village, block, district, lat, lon, online, last_seen_at)
VALUES
  ('GW-DINDORI-01', 'Gateway 01 (Dindori HQ Tower)', 'Dindori', 'Dindori', 'Nashik', 20.2014, 73.8341, true, now()),
  ('GW-VANI-02', 'Gateway 02 (Vani Kasbe Sub-Center)', 'Vani', 'Dindori', 'Nashik', 20.2512, 73.8964, true, now()),
  ('GW-NIPHAD-03', 'Gateway 03 (Niphad Border Relay)', 'Niphad Border', 'Niphad', 'Nashik', 20.1421, 73.9854, false, now() - interval '22 minutes')
ON CONFLICT (node_id) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  online = EXCLUDED.online;

-- 2. Insert Alert Recipients (Veterinary Officers & Para-Vets)
INSERT INTO public.alert_recipients (id, full_name, designation, phone, email, district, block, active, created_at, updated_at)
VALUES
  ('rec-01', 'Dr. Suresh Patil', 'Block Veterinary Officer (BVO)', '+91 98220 12345', 'bvo.dindori@ahd-mh.gov.in', 'Nashik', 'Dindori', true, now(), now()),
  ('rec-02', 'Dr. Anjali Deshmukh', 'District Veterinary Officer (DVO)', '+91 94231 67890', 'dvo.nashik@ahd-mh.gov.in', 'Nashik', 'Nashik', true, now(), now()),
  ('rec-03', 'Ramesh Gaikwad', 'Livestock Development Officer (LDO)', '+91 98500 54321', 'ldo.vani@ahd-mh.gov.in', 'Nashik', 'Dindori', true, now(), now()),
  ('rec-04', 'Sunita Jadhav', 'Para-Veterinarian (AI Technician)', '+91 99755 88990', 'sunita.jadhav@paravet-nsk.org', 'Nashik', 'Dindori', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Bharat Pashudhan Animal Records
INSERT INTO public.animals (tag_id, species, breed, sex, owner_name, owner_phone, village, block, district, lat, lon, collar_node_id, date_of_birth)
VALUES
  ('IN-MH-15-C8821', 'Cattle', 'Gir Cow', 'female', 'Santosh Kadam', '+91 98221 11223', 'Dindori', 'Dindori', 'Nashik', 20.2014, 73.8341, 'GW-DINDORI-01', '2021-04-12'),
  ('IN-MH-15-C8822', 'Cattle', 'Dangi Cross', 'female', 'Santosh Kadam', '+91 98221 11223', 'Dindori', 'Dindori', 'Nashik', 20.2032, 73.8315, 'GW-DINDORI-01', '2022-01-19'),
  ('IN-MH-15-B9410', 'Buffalo', 'Murrah', 'female', 'Eknath Shinde', '+91 94220 33445', 'Vani', 'Dindori', 'Nashik', 20.2512, 73.8964, 'GW-VANI-02', '2020-08-05'),
  ('IN-MH-15-B9411', 'Buffalo', 'Jaffarabadi', 'female', 'Eknath Shinde', '+91 94220 33445', 'Vani', 'Dindori', 'Nashik', 20.2489, 73.8941, 'GW-VANI-02', '2021-11-10'),
  ('IN-MH-15-G3301', 'Goat', 'Osmanabadi', 'female', 'Vitthal Jadhav', '+91 99701 44556', 'Pimpalgaon', 'Niphad', 'Nashik', 20.1732, 73.9892, 'GW-NIPHAD-03', '2023-02-14'),
  ('IN-MH-15-G3302', 'Goat', 'Osmanabadi', 'female', 'Vitthal Jadhav', '+91 99701 44556', 'Pimpalgaon', 'Niphad', 'Nashik', 20.1745, 73.9876, 'GW-NIPHAD-03', '2023-03-01'),
  ('IN-MH-15-C4412', 'Cattle', 'Khillari', 'male', 'Bhaurao Patil', '+91 98901 77889', 'Chandwad Border', 'Chandwad', 'Nashik', 20.3241, 74.2415, 'GW-DINDORI-01', '2021-09-22'),
  ('IN-MH-15-C4413', 'Cattle', 'Deoni', 'female', 'Bhaurao Patil', '+91 98901 77889', 'Chandwad Border', 'Chandwad', 'Nashik', 20.3255, 74.2430, 'GW-DINDORI-01', '2022-06-18')
ON CONFLICT (tag_id) DO NOTHING;

-- 4. Insert Initial Telemetry Vitals
INSERT INTO public.telemetry (tag_id, node_id, heart_rate, temp_c, vedba, thi, speed_kmh, lat, lon, bdi, band, recorded_at)
VALUES
  ('IN-MH-15-C8821', 'GW-DINDORI-01', 114, 40.8, 1.48, 81.2, 0.4, 20.2014, 73.8341, 0.88, 'critical', now() - interval '2 minutes'),
  ('IN-MH-15-C8822', 'GW-DINDORI-01', 78, 38.9, 0.62, 76.5, 1.2, 20.2032, 73.8315, 0.35, 'medium', now() - interval '4 minutes'),
  ('IN-MH-15-B9410', 'GW-VANI-02', 64, 38.3, 0.45, 74.2, 0.8, 20.2512, 73.8964, 0.18, 'low', now() - interval '1 minute'),
  ('IN-MH-15-B9411', 'GW-VANI-02', 68, 38.5, 0.51, 74.8, 0.9, 20.2489, 73.8941, 0.22, 'low', now() - interval '5 minutes'),
  ('IN-MH-15-G3301', 'GW-NIPHAD-03', 132, 40.2, 1.15, 79.4, 0.2, 20.1732, 73.9892, 0.76, 'critical', now() - interval '8 minutes'),
  ('IN-MH-15-C4412', 'GW-DINDORI-01', 72, 38.6, 0.58, 75.0, 1.0, 20.3241, 74.2415, 0.24, 'low', now() - interval '3 minutes');

-- 5. Insert Alerts
INSERT INTO public.alerts (id, title, detail, severity, tag_id, village, block, district, lat, lon, containment_radius_m, source, status, created_at)
VALUES
  (
    'alt-init-01',
    'High fever and tachycardia alert — IN-MH-15-C8821',
    'Collar telemetry detected core temp 40.8 °C (>39.2 threshold) and sustained heart rate 114 bpm. High BDI 0.88. Possible vesicular or acute infectious distress.',
    'critical',
    'IN-MH-15-C8821',
    'Dindori',
    'Dindori',
    'Nashik',
    20.2014,
    73.8341,
    3000,
    'collar',
    'open',
    now() - interval '14 minutes'
  ),
  (
    'alt-init-02',
    'Cluster vesicular fever warning — Pimpalgaon',
    'Farmer reported mouth lesions and limping in herd. Field surveillance protocol initiated.',
    'medium',
    'IN-MH-15-G3301',
    'Pimpalgaon',
    'Niphad',
    'Nashik',
    20.1732,
    73.9892,
    2000,
    'field',
    'open',
    now() - interval '42 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Lab Requisition
INSERT INTO public.lab_requisitions (id, reference, scan_token, tag_id, alert_id, sample_type, laboratory, collected_by, findings, pathogen, result_status, status, created_at)
VALUES
  (
    'req-init-01',
    'RDDL/NSK/2026/8942',
    'REQ-NSK-8942-TOK',
    'IN-MH-15-C8821',
    'alt-init-01',
    'Serum + vesicular fluid swab',
    'RDDL Western Region, Pune',
    'Dr. Suresh Patil (BVO)',
    'Sample collected at Dindori gaothan stall; cold-chain maintained at 4 °C.',
    NULL,
    'pending',
    'in_transit',
    now() - interval '10 minutes'
  )
ON CONFLICT (id) DO NOTHING;
