-- ====================================================================
-- HERDSENTINEL INITIAL SEED DATA
-- Bharat Pashudhan (INAPH) 12-digit RFID livestock tags & sensors
-- Sector: Gobichettipalayam, Erode (Tamil Nadu)
-- Centered around hardware node: 11.235695°N, 77.781448°E
-- ====================================================================

-- 1. Insert Initial Gateways
INSERT INTO public.gateways (node_id, label, village, block, district, lat, lon, online, last_seen_at)
VALUES
  ('GW-DINDORI-01', 'Gateway 01 (Pasture Base Tower)', 'Gobichettipalayam', 'Gobichettipalayam', 'Erode', 11.235695, 77.781448, true, now()),
  ('GW-KULLAM-02', 'Gateway 02 (Kullampalayam Center)', 'Kullampalayam', 'Gobichettipalayam', 'Erode', 11.242100, 77.786500, true, now()),
  ('GW-LAKKAM-03', 'Gateway 03 (Lakkampatti Sub-Relay)', 'Lakkampatti', 'Gobichettipalayam', 'Erode', 11.229500, 77.776000, false, now() - interval '22 minutes')
ON CONFLICT (node_id) DO UPDATE SET
  last_seen_at = EXCLUDED.last_seen_at,
  online = EXCLUDED.online;

-- 2. Insert Alert Recipients (Veterinary Officers & Para-Vets)
INSERT INTO public.alert_recipients (id, full_name, designation, phone, email, district, block, active, created_at, updated_at)
VALUES
  ('rec-01', 'Dr. M. Senthilkumar', 'Block Veterinary Officer (BVO)', '+91 94432 12345', 'bvo.gobi@tn.gov.in', 'Erode', 'Gobichettipalayam', true, now(), now()),
  ('rec-02', 'Dr. P. Kavitha', 'Assistant Director / District Vet Officer', '+91 94433 67890', 'ad.ah.erode@tn.gov.in', 'Erode', 'Erode', true, now(), now()),
  ('rec-03', 'K. Ramasamy', 'Livestock Inspector (LI)', '+91 98425 54321', 'li.kullampalayam@tn.gov.in', 'Erode', 'Gobichettipalayam', true, now(), now()),
  ('rec-04', 'S. Murugan', 'Para-Veterinarian (AI Technician)', '+91 99420 88990', 'murugan.paravet@erode-milk.org', 'Erode', 'Gobichettipalayam', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Bharat Pashudhan Animal Records (Clustered around user's hardware)
INSERT INTO public.animals (tag_id, species, breed, sex, owner_name, owner_phone, village, block, district, lat, lon, collar_node_id, date_of_birth)
VALUES
  ('IN-MH-2031-4471', 'Cattle', 'Kangayam', 'female', 'S. Balasubramaniam', '+91 94432 44710', 'Gobichettipalayam', 'Gobichettipalayam', 'Erode', 11.235695, 77.781448, 'GW-DINDORI-01', '2021-04-12'),
  ('IN-MH-2031-8820', 'Buffalo', 'Murrah', 'female', 'K. Ramesh Kumar', '+91 94430 88201', 'Kullampalayam', 'Gobichettipalayam', 'Erode', 11.237400, 77.783100, 'GW-DINDORI-01', '2020-08-05'),
  ('IN-MH-2031-1049', 'Sheep', 'Mecheri', 'male', 'P. Muthusamy', '+91 97890 10492', 'Lakkampatti', 'Gobichettipalayam', 'Erode', 11.234100, 77.779800, 'GW-DINDORI-01', '2022-01-19'),
  ('IN-MH-2031-9231', 'Goat', 'Tellicherry', 'female', 'V. Selvam', '+91 98420 92314', 'Pariyoor', 'Gobichettipalayam', 'Erode', 11.236800, 77.780100, 'GW-DINDORI-01', '2023-02-14')
ON CONFLICT (tag_id) DO NOTHING;

-- 4. Insert Initial Telemetry Vitals
INSERT INTO public.telemetry (tag_id, node_id, heart_rate, temp_c, vedba, thi, speed_kmh, lat, lon, bdi, band, recorded_at)
VALUES
  ('IN-MH-2031-4471', 'GW-DINDORI-01', 68, 38.6, 0.068, 74.2, 0.1, 11.235695, 77.781448, 0.19, 'low', now() - interval '1 minute'),
  ('IN-MH-2031-8820', 'GW-DINDORI-01', 66, 38.7, 0.120, 74.5, 0.4, 11.237400, 77.783100, 0.18, 'low', now() - interval '3 minutes'),
  ('IN-MH-2031-1049', 'GW-DINDORI-01', 78, 39.4, 0.080, 75.0, 0.2, 11.234100, 77.779800, 0.42, 'medium', now() - interval '5 minutes'),
  ('IN-MH-2031-9231', 'GW-DINDORI-01', 72, 38.5, 0.140, 74.0, 0.5, 11.236800, 77.780100, 0.14, 'low', now() - interval '7 minutes');

-- 5. Insert Alerts
INSERT INTO public.alerts (id, title, detail, severity, tag_id, village, block, district, lat, lon, containment_radius_m, source, status, created_at)
VALUES
  (
    'alt-init-01',
    'Pre-clinical Elevated Temperature (State 2) — IN-MH-2031-1049',
    'Collar telemetry detected core temp 39.4 °C and resting bout restlessness in pasture sector.',
    'medium',
    'IN-MH-2031-1049',
    'Lakkampatti',
    'Gobichettipalayam',
    'Erode',
    11.234100,
    77.779800,
    3000,
    'collar',
    'open',
    now() - interval '14 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Lab Requisition
INSERT INTO public.lab_requisitions (id, reference, scan_token, tag_id, alert_id, sample_type, laboratory, collected_by, findings, pathogen, result_status, status, created_at)
VALUES
  (
    'req-init-01',
    'DVDL/ERD/2026/4102',
    'REQ-ERD-4102-TOK',
    'IN-MH-2031-1049',
    'alt-init-01',
    'Serum + vesicular swab',
    'District Veterinary Diagnostic Laboratory (DVDL), Erode',
    'Dr. M. Senthilkumar (BVO)',
    'Sample collected at Lakkampatti dairy shed; cold-chain maintained at 4 °C.',
    NULL,
    'pending',
    'in_transit',
    now() - interval '10 minutes'
  )
ON CONFLICT (id) DO NOTHING;
