export type MasterAdminTab =
  | 'overview'
  | 'temples'
  | 'devices'
  | 'donations'
  | 'donors'
  | 'receipts'
  | 'donation-change-requests'
  | 'religious-events'
  | 'users'

export interface MasterAdminPageMeta {
  tab: MasterAdminTab
  title: string
  subtitle: string
}

const PAGE_META: Record<MasterAdminTab, Omit<MasterAdminPageMeta, 'tab'>> = {
  overview: {
    title: 'Operations dashboard',
    subtitle: 'Nationwide kiosk fleet · donations · platform health',
  },
  temples: {
    title: 'Temples',
    subtitle: 'Manage temple organizations and platform access',
  },
  devices: {
    title: 'Devices',
    subtitle: 'Monitor and manage registered donation kiosks',
  },
  donations: {
    title: 'Donations',
    subtitle: 'View and manage platform-wide donations',
  },
  donors: {
    title: 'Donors',
    subtitle: 'Search and manage donor profiles across temples',
  },
  receipts: {
    title: 'Receipts',
    subtitle: 'Receipt delivery, resend history, and tax receipt records',
  },
  'donation-change-requests': {
    title: 'Receipt changes',
    subtitle: 'Review donor name and receipt correction requests',
  },
  'religious-events': {
    title: 'Observances',
    subtitle: 'Manage religious events and donation campaigns',
  },
  users: {
    title: 'Users',
    subtitle: 'Manage platform and temple admin access',
  },
}

const TAB_ALIASES: Record<string, MasterAdminTab> = {
  overview: 'overview',
  temples: 'temples',
  devices: 'devices',
  donations: 'donations',
  donors: 'donors',
  receipts: 'receipts',
  'donation-change-requests': 'donation-change-requests',
  'religious-events': 'religious-events',
  users: 'users',
}

export function resolveMasterAdminTab(activeTab: string): MasterAdminTab {
  return TAB_ALIASES[activeTab] ?? 'overview'
}

export function getMasterAdminPageMeta(activeTab: string): MasterAdminPageMeta {
  const tab = resolveMasterAdminTab(activeTab)
  return { tab, ...PAGE_META[tab] }
}
