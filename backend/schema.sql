-- ==============================================================================
-- StrayBuddy Full Production Database Schema (PostgreSQL + PostGIS for Supabase)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. PROFILES & USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'spotter' CHECK (role IN ('spotter', 'feeder', 'verified_rescuer', 'admin', 'superadmin')),
  xp_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Superadmin
INSERT INTO public.profiles (username, name, email, password_hash, role, xp_points)
VALUES ('superad', 'System Superadmin', 'superad@straybuddy.local', 'superad', 'superadmin', 9999)
ON CONFLICT (username) DO NOTHING;

-- 2. STRAYS TABLE (Core Stray Animal Entity)
CREATE TABLE IF NOT EXISTS public.strays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Unnamed Buddy',
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  coat_description TEXT,
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_food', 'injured', 'pregnant_nursing', 'collared')),
  is_tnr BOOLEAN DEFAULT FALSE,
  city TEXT NOT NULL DEFAULT 'Metro Manila',
  
  -- Exact Coordinates (private) & Public Fuzzed (~150m privacy jitter)
  exact_lat DOUBLE PRECISION NOT NULL,
  exact_lng DOUBLE PRECISION NOT NULL,
  public_lat DOUBLE PRECISION NOT NULL,
  public_lng DOUBLE PRECISION NOT NULL,
  location_geom GEOGRAPHY(Point, 4326),

  -- Photos: Primary Identifier (1) + Additional Gallery Photos (Up to 3, stored as JSON array of URLs)
  identifier_photo_url TEXT NOT NULL,
  gallery_photos JSONB DEFAULT '[]'::jsonb,

  -- Interactive Counters & Timers
  fed_count INT DEFAULT 0,
  last_fed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS strays_location_idx ON public.strays USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS strays_city_idx ON public.strays (city);

-- 3. CARE & SIGHTING LOGS (Records every time a user logs fed, water, or medical update)
CREATE TABLE IF NOT EXISTS public.care_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stray_id UUID REFERENCES public.strays(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('fed', 'water', 'sighting', 'medical_alert')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. REVIEWS & COMMENTS TABLE (User ratings & comments on strays)
CREATE TABLE IF NOT EXISTS public.stray_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stray_id UUID REFERENCES public.strays(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAMPAIGNS & ANNOUNCEMENTS TABLE (Charity events & Shopee-style popup campaigns)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_photo_url TEXT,
  target_amount TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_popup BOOLEAN DEFAULT TRUE, -- If true, triggers Shopee-like announcement dialog on app open
  reactions JSONB DEFAULT '{"heart": 0, "paws": 0, "clap": 0}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Welcome Campaign
INSERT INTO public.campaigns (title, description, banner_photo_url, target_amount, is_active, is_popup)
VALUES (
  'Spay & Neuter Mission 2026',
  'Help us sponsor free TNR (Trap-Neuter-Return) for 150 community cats and dogs across Metro Manila streets. Every meal check-in helps map vulnerable strays!',
  'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80',
  '₱50,000 Goal',
  TRUE,
  TRUE
) ON CONFLICT DO NOTHING;
