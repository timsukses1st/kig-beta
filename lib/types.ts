export type Role = 'superadmin' | 'manager' | 'tim';
export type Team = 'delta' | 'creative' | 'distribution' | 'ads';
export type ContentStatus =
  | 'ide' | 'drafting' | 'review'
  | 'siap_upload' | 'terjadwal'
  | 'published' | 'diiklankan';
export type Pillar = 'lagi_ramai' | 'wajib_tonton' | 'di_balik_layar' | 'panas_timeline';
export type Division = 'semua' | 'creative' | 'distribution' | 'ads';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  team: Team | null;
  is_active: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  team: Team;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  handle: string;
  label: string | null;
  is_active: boolean;
}

export interface ContentRow {
  id: string;
  title: string;
  account_id: string | null;
  pillar: Pillar;
  status: ContentStatus;
  pic_creative: string | null;
  pic_distribution: string | null;
  pic_ads: string | null;
  deadline: string | null;
  publish_date: string | null;
  caption: string | null;
  asset_url: string | null;
  visual_hook: string | null;
  production_note: string | null;
  potensi_fyp: boolean;
  created_by:
