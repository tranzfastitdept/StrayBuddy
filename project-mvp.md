PROJECT.md — StrayBuddy (Stray Animal Tracker MVP)

System Directive for Coding Agent (Google Antigravity): Read this entire specification before generating files. Build this application incrementally, phase by phase, verifying each milestone before proceeding to the next. Prioritize zero-cost tier optimization (Vercel Hobby + Supabase Free Tier), mobile-first WebView responsiveness, client-side media compression, and animal safety privacy controls.

1. Project Identity & Core Vision
App Name: StrayBuddy
Concept: A Pokémon Go-inspired, community-driven geospatial Progressive Web App (PWA) designed for seamless WebView embedding. Users spot, photograph, pin, and care for stray cats and dogs in their neighborhood.
Target Launch Scope: Metro Manila / Luzon (starting with 10 key cities, architected for zero-budget free tiers with future horizontal scaling).
Primary Goals:
Real-Time Radar Map: Interactive map displaying nearby stray animals with species markers, care status, and feeding cooldowns.
One-Tap Tagging: Snap a photo, extract/lock GPS coordinates, and log a sighting in under 15 seconds.
Community Care Loop: Allow passersby and local feeders to log "Fed" or "Water Refilled" check-ins with cooldown timers to prevent overfeeding.
Animal Safety First: Fuzz public coordinates (100m–250m radius jitter) so bad actors cannot pinpoint vulnerable strays, while unlocking exact coordinates only for verified rescuers/admins.
2. Zero-Budget Tech Stack & Architecture
Frontend & Deployment
Framework: Next.js (App Router, TypeScript) — Chosen over Expo Web for native Vercel zero-config deployment, fast SSR/ISR, lightweight API routes, and effortless mobile WebView wrapping.
Styling: Tailwind CSS + Lucide React icons (Mobile-first bottom-sheet UI modeled after Pokémon Go / Google Maps).
Map Engine: Leaflet + react-leaflet with OpenStreetMap / CartoDB Positron tiles — 100% free, zero API billing surprises, lightweight inside Android/iOS WebViews.
Client-Side Media Optimization: browser-image-compression — Compresses camera photos to < 250KB WebP/JPEG on the user's device before upload to preserve Supabase Storage free-tier limits (1GB) and strip raw EXIF GPS tags for safety.
Backend & Database Strategy
Hosting: Vercel (Hobby / Free Tier).
Database & Auth: Supabase (Free Tier — PostgreSQL + PostGIS + Auth + Storage).
Multi-City / Multi-DB Routing Architecture (Free-Tier Scaling Strategy):
Phase 1 (Current MVP): Use a single Supabase instance with a city column (Manila, Makati, Quezon City, Taguig, Pasig, Mandaluyong, Pasay, Parañaque, Caloocan, Las Piñas) + Row Level Security (RLS) and spatial indexing. This avoids Vercel serverless timeout bottlenecks and connection pool exhaustion.
Phase 2 (Optional Multi-Shard Router): Include a clean database router abstraction (lib/db/shardRouter.ts) that maps a detected city string to a Supabase client config dictionary (SUPABASE_SHARDS[city]). By default, all 10 cities point to the primary .env Supabase credentials, allowing you to drop in separate Supabase project URLs/Keys per city later without rewriting application logic. Admin "All Cities" queries must use Promise.allSettled() (parallel execution) rather than sequential loops to stay well within Vercel's 10-second serverless function limit.
3. Database Schema (Supabase / PostgreSQL + PostGIS)

Execute this schema in the Supabase SQL Editor during Phase 1:

sql
-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
-- 1. User Profiles & Roles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'spotter' CHECK (role IN ('spotter', 'feeder', 'verified_rescuer', 'admin')),
  xp_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Stray Animals (Persistent Entity)
CREATE TABLE public.strays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT DEFAULT 'Unnamed Buddy',
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  coat_description TEXT,
  health_status TEXT DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'needs_food', 'injured', 'pregnant_nursing', 'collared')),
  is_tnr BOOLEAN DEFAULT FALSE, -- Ear-tipped / Spayed-Neutered indicator
  city TEXT NOT NULL,
  
  -- Exact coordinates (Restricted via RLS / Server API)
  exact_lat DOUBLE PRECISION NOT NULL,
  exact_lng DOUBLE PRECISION NOT NULL,
  
  -- Public fuzzed coordinates (~150m random offset for animal safety)
  public_lat DOUBLE PRECISION NOT NULL,
  public_lng DOUBLE PRECISION NOT NULL,
  location_geom GEOGRAPHY(Point, 4326),
  
  photo_url TEXT NOT NULL,
  last_fed_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Spatial index for fast map viewport queries
CREATE INDEX strays_location_idx ON public.strays USING GIST (location_geom);
CREATE INDEX strays_city_idx ON public.strays (city);
-- 3. Care & Sighting Logs (Feeding, Water, Health Updates)
CREATE TABLE public.care_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stray_id UUID REFERENCES public.strays(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('fed', 'water', 'sighting', 'medical_alert')),
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
4. Directory Structure
text
straybuddy/
├── app/
│   ├── layout.tsx              # Mobile-first shell, PWA meta tags, WebView viewport locks
│   ├── page.tsx                # Main Radar Map View (Pokémon Go style HUD)
│   ├── admin/
│   │   └── page.tsx            # Multi-city admin dashboard & filtration panel
│   └── api/
│       ├── strays/
│       │   └── route.ts        # GET (viewport/city filtered), POST (create + fuzz coords)
│       ├── care/
│       │   └── route.ts        # POST (log feeding/water & update cooldown)
│       └── admin/
│           └── aggregate/
│               └── route.ts    # Parallel shard aggregator for Admin panel
├── components/
│   ├── map/
│   │   ├── RadarMap.tsx        # Dynamic Leaflet map (SSR disabled)
│   │   ├── StrayMarker.tsx     # Custom Cat/Dog pins + status rings
│   │   └── StrayDrawer.tsx     # Bottom sheet profile, feeding cooldown & care actions
│   ├── capture/
│   │   └── TagStrayModal.tsx   # Camera capture, GPS lock, client-side compression
│   └── admin/
│       └── CityFilterTable.tsx # Admin sorting/filtering by city, species, and health
├── lib/
│   ├── db/
│   │   └── shardRouter.ts      # City-to-Supabase connection router (supports 1 to 10 DBs)
│   ├── geo/
│   │   ├── fuzzCoordinates.ts  # Deterministic/random 150m safety offset generator
│   │   └── detectCity.ts       # Reverse-geocoding / bounding-box Metro Manila city detector
│   └── media/
│       └── compressImage.ts    # Client-side image compression + EXIF strip
└── .env.local.example          # Environment variable template
5. Step-by-Step Build Instructions for Agent

Execute these phases sequentially. Do not skip error handling or mobile WebView compatibility checks.

Phase 1: Project Scaffolding & Core Utilities
Initialize a Next.js 14+ TypeScript project with Tailwind CSS (npx create-next-app@latest straybuddy --typescript --tailwind --eslint --app).
Install dependencies: npm install @supabase/supabase-js leaflet react-leaflet @types/leaflet lucide-react browser-image-compression.
Create lib/geo/fuzzCoordinates.ts: Write a helper function fuzzCoordinates(lat: number, lng: number, radiusMeters = 150) that offsets coordinates randomly within a 100m–200m radius so public pins protect animal locations.
Create lib/geo/detectCity.ts: Write a bounding-box / reverse-geocode helper that maps (lat, lng) to one of the 10 target Metro Manila cities (defaulting to 'Metro Manila' if outside bounds).
Create lib/db/shardRouter.ts: Implement getSupabaseClientForCity(city: string) and getAllShardClients() so the app works seamlessly with 1 Supabase database now and scales to 10 city-sharded databases via environment variables later.
Phase 2: Geospatial Radar Map (Frontend Core)
Build components/map/RadarMap.tsx (dynamically imported with ssr: false to prevent window is not defined build errors on Vercel).
Add a "Locate Me" floating action button using navigator.geolocation.getCurrentPosition with high-accuracy options and clean fallback error messaging for WebView permissions.
Render custom markers (StrayMarker.tsx):
Distinct icons/avatars for Cats vs. Dogs.
Visual ring indicators: Green (Healthy), Amber (Needs Food), Red pulsing (Injured/Urgent).
Display fuzzed coordinates (public_lat, public_lng) for standard users, and exact coordinates only if the user's role is verified_rescuer or admin.
Phase 3: Quick-Tag Capture Flow & Image Compression
Build components/capture/TagStrayModal.tsx triggered by a prominent bottom-center "Spot Stray" button.
Use <input type="file" accept="image/*" capture="environment" /> so both mobile browsers and native WebViews trigger the rear camera reliably.
Pass the captured file through lib/media/compressImage.ts (maxSizeMB: 0.25, maxWidthOrHeight: 1024) before uploading to the Supabase Storage stray-photos bucket.
Before finalizing a new pin, query /api/strays?lat=...&lng=...&radius=50 to check for existing sightings within 50 meters and prompt the user: "Is this one of these buddies nearby?" to prevent duplicate pins.
Phase 4: Community Care & Feeding Cooldown System
Build components/map/StrayDrawer.tsx (slide-up bottom drawer when tapping a map pin).
Display the animal's photo, species, coat description, TNR status, and Feeding Cooldown Badge (e.g., "Fed 45 mins ago" in green if < 4 hours, or "Hungry — Last fed 6h ago" in amber).
Add one-tap action buttons: "Log Fed", "Refilled Water", and "Report Urgent/Injured", which POST to /api/care and award +10 XP to the user's profile.
Phase 5: Multi-City Admin Panel & Filtration System
Build app/admin/page.tsx with role protection.
Implement the city selector (All Cities + the 10 individual cities) and filters for Species (All, Cat, Dog) and Health Status.
In /api/admin/aggregate/route.ts, query active shard clients using Promise.allSettled() (parallel async execution) so aggregating stats across multiple free-tier databases completes in < 1.5 seconds on Vercel without timing out.
6. WebView & Vercel Free-Tier Guardrails
WebView Compatibility:
Include user-scalable=no, maximum-scale=1.0 in viewport metadata so double-tapping map controls doesn't zoom the WebView container awkwardly.
Ensure all external links open cleanly and camera inputs rely on standard HTML5 capture attributes rather than experimental WebRTC streams that break in iOS WKWebView.
Vercel Serverless Optimization:
Keep API routes stateless and lightweight.
Debounce map pan/zoom fetch requests on the client by 400ms so dragging the map doesn't spam Vercel function invocations.
Supabase Free-Tier Preservation:
Enforce client-side image compression strictly before upload (< 250KB per photo allows ~4,000+ stray photos within the 1GB free storage limit).
Select only required columns in SELECT queries rather than SELECT *.