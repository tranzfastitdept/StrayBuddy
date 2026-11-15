export type Species = 'cat' | 'dog';

export type HealthStatus = 'healthy' | 'needs_food' | 'injured' | 'pregnant_nursing' | 'collared';

export type UserRole = 'spotter' | 'feeder' | 'verified_rescuer' | 'admin' | 'superadmin';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  xp_points: number;
  created_at: string;
}

export interface Stray {
  id: string;
  created_by?: string | null;
  name: string;
  species: Species;
  coat_description?: string | null;
  health_status: HealthStatus;
  is_tnr: boolean;
  city: string;
  exact_lat?: number;
  exact_lng?: number;
  public_lat: number;
  public_lng: number;
  identifier_photo_url: string;
  photo_url?: string; // Optional legacy backward-compatible alias
  gallery_photos?: string[]; // Up to 3 additional photos
  fed_count: number;
  last_fed_at: string | null;
  last_seen_at: string;
  created_at: string;
}

export interface CareLog {
  id: string;
  stray_id: string;
  user_id?: string | null;
  username?: string | null;
  action_type: 'fed' | 'water' | 'sighting' | 'medical_alert';
  notes?: string | null;
  created_at: string;
}

export interface StrayReview {
  id: string;
  stray_id: string;
  user_id?: string | null;
  username: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  banner_photo_url: string;
  target_amount?: string;
  is_active: boolean;
  is_popup: boolean;
  reactions: {
    heart: number;
    paws: number;
    clap: number;
  };
  created_by?: string | null;
  created_at: string;
}
