/** Operational status derived from backend state + heartbeat */
export type DeviceOperationalStatus = 'online' | 'offline' | 'warning' | 'deactivated' | 'pending'

/** Backend device status enum */
export type DeviceBackendStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE'

export interface DeviceListItem {
  id: string
  label: string
  deviceCode: string
  templeId: string
  templeName: string
  status: DeviceBackendStatus
  operationalStatus: DeviceOperationalStatus
  lastSeenAt: string | null
  lastActivityAt?: string | null
  tokenStatus?: 'valid' | 'expired' | 'none' | null
  readerConnected?: boolean | null
  activatedAt?: string | null
  createdAt: string
}

export interface DeviceSummary {
  total: number
  online: number
  offline: number
  needingAttention: number
}
