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
  analytics: OverviewIcon,
  'live-activity': OverviewIcon,
  temples: TemplesIcon,
  devices: DevicesIcon,
  donations: DonationsIcon,
  donors: UsersIcon,
  receipts: ReceiptIcon,
  'donation-change-requests': ReceiptIcon,
  'religious-events': ReligiousEventsIcon,
  transactions: DonationsIcon,
  users: UsersIcon,
}

export function NavItemIcon({ id }: { id: string }) {
  const Icon = NAV_ICON_MAP[id] ?? OverviewIcon
  return <Icon />
}
