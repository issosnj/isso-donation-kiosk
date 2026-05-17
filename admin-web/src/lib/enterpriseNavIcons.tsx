import {
  OverviewIcon,
  TemplesIcon,
  DonationsIcon,
  UsersIcon,
  DevicesIcon,
  ReceiptIcon,
  ReligiousEventsIcon,
} from '@/components/Icons'

const NAV_ICON_MAP: Record<string, () => JSX.Element> = {
  overview: OverviewIcon,
  temples: TemplesIcon,
  devices: DevicesIcon,
  donations: DonationsIcon,
  donors: UsersIcon,
  receipts: ReceiptIcon,
  'donation-change-requests': ReceiptIcon,
  'religious-events': ReligiousEventsIcon,
  users: UsersIcon,
  reports: OverviewIcon,
  refunds: OverviewIcon,
  payouts: OverviewIcon,
  settings: OverviewIcon,
  branding: OverviewIcon,
  'feature-flags': OverviewIcon,
}

export function NavItemIcon({ id }: { id: string }) {
  const Icon = NAV_ICON_MAP[id] ?? OverviewIcon
  return <Icon />
}
