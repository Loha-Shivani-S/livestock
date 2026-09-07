-- ====================================================================
-- HERDSENTINEL: MULTI-SPECIES LIVESTOCK EARLY WARNING SCHEMA
-- Compatible with Supabase PostgreSQL (PostgREST 14+)
-- ====================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE public.risk_band AS ENUM ('low', 'medium', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('district_officer', 'block_vet_officer', 'para_vet', 'farmer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Helper Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Officer / Field Worker',
  designation text NOT NULL DEFAULT 'Veterinary Officer',
  phone text,
  district text NOT NULL DEFAULT 'Nashik',
  block text NOT NULL DEFAULT 'Dindori',
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'farmer',
  UNIQUE(user_id, role)
);

-- 5. Animals Table (Bharat Pashudhan RFID / INAPH format)
CREATE TABLE IF NOT EXISTS public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id text UNIQUE NOT NULL,
  species text NOT NULL,
  breed text NOT NULL,
  sex text NOT NULL DEFAULT 'female',
  date_of_birth date,
  owner_name text NOT NULL,
  owner_phone text,
  village text NOT NULL,
  block text NOT NULL DEFAULT 'Dindori',
  district text NOT NULL DEFAULT 'Nashik',
  lat double precision NOT NULL DEFAULT 20.2014,
  lon double precision NOT NULL DEFAULT 73.8341,
  collar_node_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_animals_tag ON public.animals(tag_id);
CREATE INDEX IF NOT EXISTS idx_animals_village ON public.animals(village);
CREATE INDEX IF NOT EXISTS idx_animals_collar ON public.animals(collar_node_id);

-- 6. Gateways Table (LoRa / GSM Ingest Nodes)
CREATE TABLE IF NOT EXISTS public.gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text UNIQUE NOT NULL,
  label text NOT NULL,
  village text NOT NULL,
  block text NOT NULL DEFAULT 'Dindori',
  district text NOT NULL DEFAULT 'Nashik',
  lat double precision NOT NULL DEFAULT 20.2014,
  lon double precision NOT NULL DEFAULT 73.8341,
  online boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Telemetry Table (Collar Sensor Ingest)
CREATE TABLE IF NOT EXISTS public.telemetry (
  id bigserial PRIMARY KEY,
  tag_id text NOT NULL,
  node_id text,
  heart_rate integer NOT NULL,
  temp_c double precision NOT NULL,
  vedba double precision NOT NULL DEFAULT 0,
  thi double precision,
  speed_kmh double precision NOT NULL DEFAULT 0,
  lat double precision,
  lon double precision,
  bdi double precision NOT NULL DEFAULT 0,
  band public.risk_band NOT NULL DEFAULT 'low',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_tag ON public.telemetry(tag_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_recorded_at ON public.telemetry(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_band ON public.telemetry(band);

-- 8. Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
  id text PRIMARY KEY,
  title text NOT NULL,
  detail text NOT NULL,
  severity public.risk_band NOT NULL DEFAULT 'low',
  tag_id text,
  village text NOT NULL DEFAULT 'Dindori',
  block text NOT NULL DEFAULT 'Dindori',
  district text NOT NULL DEFAULT 'Nashik',
  lat double precision,
  lon double precision,
  containment_radius_m integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'system',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

-- 9. Field Reports Table
CREATE TABLE IF NOT EXISTS public.field_reports (
  id text PRIMARY KEY,
  reported_by text,
  reporter_name text NOT NULL DEFAULT 'Livestock Owner / Para-vet',
  tag_id text,
  species text NOT NULL DEFAULT 'Cattle',
  affected_count integer NOT NULL DEFAULT 1,
  mortality_count integer NOT NULL DEFAULT 0,
  symptoms text[] NOT NULL DEFAULT '{}',
  notes text,
  voice_transcript text,
  language text NOT NULL DEFAULT 'en',
  village text NOT NULL DEFAULT 'Dindori',
  block text NOT NULL DEFAULT 'Dindori',
  district text NOT NULL DEFAULT 'Nashik',
  lat double precision DEFAULT 20.2014,
  lon double precision DEFAULT 73.8341,
  channel text NOT NULL DEFAULT 'mobile',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_created ON public.field_reports(created_at DESC);

-- 10. Lab Requisitions Table
CREATE TABLE IF NOT EXISTS public.lab_requisitions (
  id text PRIMARY KEY,
  reference text UNIQUE NOT NULL,
  scan_token text NOT NULL,
  tag_id text,
  alert_id text REFERENCES public.alerts(id) ON DELETE SET NULL,
  sample_type text NOT NULL,
  laboratory text NOT NULL DEFAULT 'RDDL Pune',
  collected_by text,
  findings text,
  pathogen text,
  result_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'in_transit',
  reported_at timestamptz,
  reported_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lab_scan ON public.lab_requisitions(scan_token);
CREATE INDEX IF NOT EXISTS idx_lab_ref ON public.lab_requisitions(reference);

-- 11. Alert Recipients Table
CREATE TABLE IF NOT EXISTS public.alert_recipients (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  designation text NOT NULL,
  phone text,
  email text,
  district text NOT NULL DEFAULT 'Nashik',
  block text NOT NULL DEFAULT 'Dindori',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Notifications Audit Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY,
  alert_id text REFERENCES public.alerts(id) ON DELETE SET NULL,
  report_id text REFERENCES public.field_reports(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  channel text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 13. Vaccinations Table
CREATE TABLE IF NOT EXISTS public.vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id text NOT NULL REFERENCES public.animals(tag_id) ON DELETE CASCADE,
  vaccine text NOT NULL,
  batch_no text,
  administered_on date NOT NULL DEFAULT CURRENT_DATE,
  next_due_on date,
  administered_by text
);

-- 14. Treatments Table
CREATE TABLE IF NOT EXISTS public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id text NOT NULL REFERENCES public.animals(tag_id) ON DELETE CASCADE,
  diagnosis text NOT NULL,
  medicine text,
  treated_on date NOT NULL DEFAULT CURRENT_DATE,
  attending_vet text,
  notes text
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures seamless read and write across web client, LoRa gateways & admin
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

-- Permissive public read for HerdSentinel surveillance displays
DROP POLICY IF EXISTS "Public can view animals" ON public.animals;
CREATE POLICY "Public can view animals" ON public.animals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert animals" ON public.animals;
CREATE POLICY "Public can insert animals" ON public.animals FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update animals" ON public.animals;
CREATE POLICY "Public can update animals" ON public.animals FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view gateways" ON public.gateways;
CREATE POLICY "Public can view gateways" ON public.gateways FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert gateways" ON public.gateways;
CREATE POLICY "Public can insert gateways" ON public.gateways FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update gateways" ON public.gateways;
CREATE POLICY "Public can update gateways" ON public.gateways FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view telemetry" ON public.telemetry;
CREATE POLICY "Public can view telemetry" ON public.telemetry FOR SELECT USING (true);

DROP POLICY IF EXISTS "Collar gateways can insert telemetry" ON public.telemetry;
CREATE POLICY "Collar gateways can insert telemetry" ON public.telemetry FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view alerts" ON public.alerts;
CREATE POLICY "Public can view alerts" ON public.alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert alerts" ON public.alerts;
CREATE POLICY "Public can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update alerts" ON public.alerts;
CREATE POLICY "Public can update alerts" ON public.alerts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view field reports" ON public.field_reports;
CREATE POLICY "Public can view field reports" ON public.field_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit field reports" ON public.field_reports;
CREATE POLICY "Anyone can submit field reports" ON public.field_reports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view lab requisitions" ON public.lab_requisitions;
CREATE POLICY "Public can view lab requisitions" ON public.lab_requisitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert lab requisitions" ON public.lab_requisitions;
CREATE POLICY "Public can insert lab requisitions" ON public.lab_requisitions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update lab requisitions" ON public.lab_requisitions;
CREATE POLICY "Public can update lab requisitions" ON public.lab_requisitions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can view alert recipients" ON public.alert_recipients;
CREATE POLICY "Public can view alert recipients" ON public.alert_recipients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage alert recipients" ON public.alert_recipients;
CREATE POLICY "Public can manage alert recipients" ON public.alert_recipients FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;
CREATE POLICY "Public can view notifications" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert notifications" ON public.notifications;
CREATE POLICY "Public can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view vaccinations" ON public.vaccinations;
CREATE POLICY "Public can view vaccinations" ON public.vaccinations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage vaccinations" ON public.vaccinations;
CREATE POLICY "Public can manage vaccinations" ON public.vaccinations FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can view treatments" ON public.treatments;
CREATE POLICY "Public can view treatments" ON public.treatments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage treatments" ON public.treatments;
CREATE POLICY "Public can manage treatments" ON public.treatments FOR ALL USING (true);

-- ====================================================================
-- SUPABASE REALTIME REPLICATION
-- Broadcasts changes live to connected web apps
-- ====================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.field_reports;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_requisitions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.gateways;
EXCEPTION
  WHEN others THEN null;
END $$;
