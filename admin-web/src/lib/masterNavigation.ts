export type NavItem = {
  id: string
  label: string
  tab?: string
  href?: string
  soon?: boolean
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

export type QuickAction = {
  id: string
  label: string
  tab?: string
  /** Scroll to alert center on overview (no route yet). */
  scrollTo?: 'alerts'
  soon?: boolean
}

export type CommandPaletteEntry = {
  id: string
  label: string
  tab?: string
  group: string
  keywords?: string[]
  soon?: boolean
}

export const MASTER_NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', tab: 'overview' },
      { id: 'analytics', label: 'Analytics', tab: 'overview' },
      { id: 'live-activity', label: 'Live Activity', tab: 'overview' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { id: 'temples', label: 'Temples', tab: 'temples' },
      { id: 'devices', label: 'Devices', tab: 'devices' },
      { id: 'donations', label: 'Donations', tab: 'donations' },
      { id: 'donors', label: 'Donors', tab: 'donors' },
      { id: 'receipts', label: 'Receipts', tab: 'receipts' },
      { id: 'donation-change-requests', label: 'Receipt changes', tab: 'donation-change-requests' },
      { id: 'religious-events', label: 'Observances', tab: 'religious-events' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [
      { id: 'transactions', label: 'Transactions', tab: 'donations' },
      { id: 'refunds', label: 'Refunds', soon: true },
      { id: 'payouts', label: 'Payouts', soon: true },
      { id: 'reports', label: 'Reports', soon: true },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'users', label: 'Users & Roles', tab: 'users' },
      { id: 'audit-logs', label: 'Audit Logs', soon: true },
      { id: 'notifications', label: 'Notifications', soon: true },
      { id: 'integrations', label: 'Integrations', soon: true },
      { id: 'api-keys', label: 'API Keys', soon: true },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    items: [
      { id: 'branding', label: 'Branding', soon: true },
      { id: 'billing', label: 'Billing', soon: true },
      { id: 'feature-flags', label: 'Feature Flags', soon: true },
      { id: 'settings', label: 'System Settings', soon: true },
    ],
  },
]

/** Primary pages surfaced in CMD+K search (deduplicated by tab). */
export const COMMAND_PALETTE_PAGES: CommandPaletteEntry[] = [
  { id: 'nav-dashboard', label: 'Dashboard', tab: 'overview', group: 'Navigate', keywords: ['home', 'operations', 'overview'] },
  { id: 'nav-temples', label: 'Temples', tab: 'temples', group: 'Navigate', keywords: ['organizations'] },
  { id: 'nav-devices', label: 'Devices', tab: 'devices', group: 'Navigate', keywords: ['kiosks', 'fleet'] },
  { id: 'nav-donations', label: 'Donations', tab: 'donations', group: 'Navigate', keywords: ['transactions', 'payments'] },
  { id: 'nav-donors', label: 'Donors', tab: 'donors', group: 'Navigate' },
  { id: 'nav-receipts', label: 'Receipts', tab: 'receipts', group: 'Navigate' },
  { id: 'nav-users', label: 'Users', tab: 'users', group: 'Navigate', keywords: ['roles', 'admin'] },
  { id: 'nav-observances', label: 'Observances', tab: 'religious-events', group: 'Navigate', keywords: ['events', 'calendar'] },
  { id: 'nav-receipt-changes', label: 'Receipt changes', tab: 'donation-change-requests', group: 'Navigate' },
  { id: 'nav-audit', label: 'Audit Logs', group: 'Navigate', soon: true },
]

export const TEMPLE_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', tab: 'overview' },
  { id: 'donations', label: 'Donations', tab: 'donations' },
  { id: 'donors', label: 'Donors', tab: 'donors' },
  { id: 'devices', label: 'Devices', tab: 'devices' },
  { id: 'categories', label: 'Categories', tab: 'categories' },
  { id: 'stripe', label: 'Stripe', tab: 'stripe' },
  { id: 'receipts', label: 'Receipts', tab: 'receipts' },
]

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'add-temple', label: 'Add Temple', tab: 'temples' },
  { id: 'register-kiosk', label: 'Register Kiosk', tab: 'devices' },
  { id: 'export-donations', label: 'Export Donations', tab: 'donations' },
  { id: 'create-admin', label: 'Create Admin User', tab: 'users' },
  { id: 'view-alerts', label: 'View Alerts', scrollTo: 'alerts' },
  { id: 'audit-logs', label: 'Open Audit Logs', soon: true },
]
