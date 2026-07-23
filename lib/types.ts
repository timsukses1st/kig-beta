export type Role = 'superadmin' | 'manager' | 'tim';
export type Team = 'delta' | 'creative' | 'distribution' | 'ads';
export type ContentStatus =
  | 'ide'
  | 'drafting'
  | 'review'
  | 'siap_upload'
  | 'terjadwal'
  | 'published';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  team: Team | null;
  is_active: boolean;
  created_at: string;
}

export interface ContentRow {
  id: string;
  title: string;
  account: string;
  pillar: string;
  format: string;
  status: ContentStatus;
  pic: string | null;
  scheduled_at: string | null;
  published_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_title: string | null;
  detail: string | null;
  created_at: string;
}

export const STATUSES: { key: ContentStatus; label: string; ownerTeam: Team }[] = [
  { key: 'ide', label: 'Ide', ownerTeam: 'creative' },
  { key: 'drafting', label: 'Drafting', ownerTeam: 'creative' },
  { key: 'review', label: 'Review', ownerTeam: 'creative' },
  { key: 'siap_upload', label: 'Siap Upload', ownerTeam: 'distribution' },
  { key: 'terjadwal', label: 'Terjadwal', ownerTeam: 'distribution' },
  { key: 'published', label: 'Published', ownerTeam: 'ads' },
];

// Status yang boleh DI-EDIT (baris sedang berada di tahap ini)
export const TEAM_EDITABLE: Record<Team, ContentStatus[]> = {
  delta: ['ide', 'drafting', 'review', 'siap_upload', 'terjadwal', 'published'],
  creative: ['ide', 'drafting', 'review'],
  distribution: ['siap_upload', 'terjadwal'],
  ads: ['published'],
};

// Status TUJUAN yang boleh dipilih tim tsb (termasuk handoff ke tahap berikutnya)
export const TEAM_TARGETABLE: Record<Team, ContentStatus[]> = {
  delta: ['ide', 'drafting', 'review', 'siap_upload', 'terjadwal', 'published'],
  creative: ['ide', 'drafting', 'review', 'siap_upload'],
  distribution: ['siap_upload', 'terjadwal', 'published'],
  ads: ['published'],
};

export const ACCOUNTS = ['@cinemasocietyy', '@mediaruangfilm', 'Lainnya'];
export const PILLARS = ['Lagi Ramai', 'Wajib Tonton', 'Di Balik Layar', 'Panas di Timeline'];
export const FORMATS = ['Reels', 'Carousel', 'Single Image', 'Story'];

export function canEditRow(profile: Profile | null, status: ContentStatus): boolean {
  if (!profile) return false;
  if (profile.role === 'superadmin' || profile.role === 'manager') return true;
  if (!profile.team) return false;
  return TEAM_EDITABLE[profile.team].includes(status);
}

export function targetableStatuses(profile: Profile | null, current: ContentStatus): ContentStatus[] {
  if (!profile) return [current];
  if (profile.role === 'superadmin' || profile.role === 'manager')
    return STATUSES.map((s) => s.key);
  if (!profile.team) return [current];
  const targets = TEAM_TARGETABLE[profile.team];
  return targets.includes(current) ? targets : [current];
}
