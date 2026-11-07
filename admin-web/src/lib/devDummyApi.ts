import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

/**
 * In-memory sample data for the local dummy admin session only.
 * A real sign-in still talks to the API.
 */

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const temples = [
  {
    id: 'temple-kalupur',
    name: 'Shree Swaminarayan Mandir, Kalupur',
    address: 'Kalupur, Ahmedabad, Gujarat',
    timezone: 'Asia/Kolkata',
    stripeAccountId: 'acct_kalupur_demo',
    stripePublishableKey: 'pk_test_kalupur',
  },
  {
    id: 'temple-chicago',
    name: 'ISSO Chicago',
    address: 'Schaumburg, Illinois',
    timezone: 'America/Chicago',
    stripeAccountId: 'acct_chicago_demo',
    stripePublishableKey: 'pk_test_chicago',
  },
  {
    id: 'temple-nj',
    name: 'ISSO New Jersey',
    address: 'Edison, New Jersey',
    timezone: 'America/New_York',
    stripeAccountId: null as string | null,
    stripePublishableKey: null as string | null,
  },
]

const categories = [
  { id: 'cat-general', name: 'General' },
  { id: 'cat-annakut', name: 'Annakut' },
  { id: 'cat-festival', name: 'Festival' },
]

const donors = [
  {
    id: 'donor-1',
    name: 'Vijay Patel',
    phone: '7325550142',
    email: 'vijay.patel@example.com',
    address: '14 Temple St, Edison, NJ',
    templeId: 'temple-nj',
    totalDonations: 4,
    totalAmount: 860,
    lastDonationDate: hoursAgo(5) as string | null,
    createdAt: hoursAgo(24 * 400),
    updatedAt: hoursAgo(5),
  },
  {
    id: 'donor-2',
    name: 'Meera Shah',
    phone: '3125550190',
    email: 'meera.shah@example.com',
    address: '88 Higgins Rd, Schaumburg, IL',
    templeId: 'temple-chicago',
    totalDonations: 2,
    totalAmount: 251,
    lastDonationDate: hoursAgo(30),
    createdAt: hoursAgo(24 * 40),
    updatedAt: hoursAgo(30),
  },
  {
    id: 'donor-3',
    name: 'Ramesh Desai',
    phone: '9175550118',
    email: 'ramesh.desai@example.com',
    address: 'Kalupur, Ahmedabad',
    templeId: 'temple-kalupur',
    totalDonations: 6,
    totalAmount: 2400,
    lastDonationDate: hoursAgo(2),
    createdAt: hoursAgo(24 * 800),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'donor-4',
    name: 'Anita Joshi',
    phone: '8485550177',
    email: 'anita.joshi@example.com',
    address: '2 Oak Lane, Iselin, NJ',
    templeId: 'temple-nj',
    totalDonations: 1,
    totalAmount: 51,
    lastDonationDate: hoursAgo(20),
    createdAt: hoursAgo(24 * 12),
    updatedAt: hoursAgo(20),
  },
  {
    id: 'donor-5',
    name: null as string | null,
    phone: '0000000000',
    email: null as string | null,
    address: null as string | null,
    templeId: 'temple-chicago',
    totalDonations: 1,
    totalAmount: 21,
    lastDonationDate: null,
    createdAt: hoursAgo(24 * 50),
    updatedAt: hoursAgo(50),
  },
]

type DummyDonation = {
  id: string
  templeId: string
  deviceId: string
  amount: number
  refundedAmount: number
  stripeFee: number
  status: string
  createdAt: string
  receiptNumber: string | null
  donorName: string | null
  donorPhone: string | null
  donorEmail: string | null
  donorAddress: string | null
  donorId: string | null
  stripePaymentIntentId: string | null
  category: { id: string; name: string }
  temple: { id: string; name: string }
}

function templeName(id: string) {
  return temples.find((temple) => temple.id === id)?.name || 'Temple'
}

function donation(
  partial: Pick<DummyDonation, 'id' | 'templeId' | 'deviceId' | 'amount' | 'status' | 'createdAt' | 'category'> &
    Partial<DummyDonation>,
): DummyDonation {
  return {
    refundedAmount: 0,
    stripeFee: Math.round(partial.amount * 0.029 * 100) / 100,
    receiptNumber: partial.status === 'SUCCEEDED' ? `ISSO-K-${partial.id.slice(-4)}` : null,
    donorName: null,
    donorPhone: null,
    donorEmail: null,
    donorAddress: null,
    donorId: null,
    stripePaymentIntentId: partial.status === 'PENDING' ? null : `pi_${partial.id}`,
    temple: { id: partial.templeId, name: templeName(partial.templeId) },
    ...partial,
  }
}

const donations: DummyDonation[] = [
  donation({
    id: 'don-1001',
    templeId: 'temple-kalupur',
    deviceId: 'device-kalupur-1',
    amount: 501,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(2),
    category: categories[0],
    donorId: 'donor-3',
    donorName: 'Ramesh Desai',
    donorPhone: '9175550118',
    donorEmail: 'ramesh.desai@example.com',
  }),
  donation({
    id: 'don-1002',
    templeId: 'temple-nj',
    deviceId: 'device-nj-1',
    amount: 108,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(5),
    category: categories[2],
    donorId: 'donor-1',
    donorName: 'Vijay Patel',
    donorPhone: '7325550142',
    donorEmail: 'vijay.patel@example.com',
  }),
  donation({
    id: 'don-1003',
    templeId: 'temple-chicago',
    deviceId: 'device-chicago-1',
    amount: 51,
    status: 'FAILED',
    createdAt: hoursAgo(8),
    category: categories[0],
    donorName: 'Guest',
    stripePaymentIntentId: 'pi_don-1003',
  }),
  donation({
    id: 'don-1004',
    templeId: 'temple-chicago',
    deviceId: 'device-chicago-1',
    amount: 21,
    status: 'PENDING',
    createdAt: hoursAgo(1),
    category: categories[1],
    stripePaymentIntentId: null,
  }),
  donation({
    id: 'don-1005',
    templeId: 'temple-nj',
    deviceId: 'device-nj-1',
    amount: 251,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(26),
    category: categories[0],
    donorId: 'donor-4',
    donorName: 'Anita Joshi',
    donorPhone: '8485550177',
    donorEmail: 'anita.joshi@example.com',
    refundedAmount: 50,
  }),
  donation({
    id: 'don-1006',
    templeId: 'temple-kalupur',
    deviceId: 'device-kalupur-2',
    amount: 1001,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(24 * 6),
    category: categories[1],
    donorId: 'donor-3',
    donorName: 'Ramesh Desai',
    donorPhone: '9175550118',
    donorEmail: 'ramesh.desai@example.com',
  }),
  donation({
    id: 'don-1007',
    templeId: 'temple-chicago',
    deviceId: 'device-chicago-1',
    amount: 151,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(24 * 12),
    category: categories[2],
    donorId: 'donor-2',
    donorName: 'Meera Shah',
    donorPhone: '3125550190',
    donorEmail: 'meera.shah@example.com',
  }),
  donation({
    id: 'don-1008',
    templeId: 'temple-nj',
    deviceId: 'device-nj-2',
    amount: 75,
    status: 'SUCCEEDED',
    createdAt: hoursAgo(24 * 35),
    category: categories[0],
    donorId: 'donor-1',
    donorName: 'Vijay Patel',
    donorPhone: '7325550142',
    donorEmail: 'vijay.patel@example.com',
  }),
  donation({
    id: 'don-1009',
    templeId: 'temple-kalupur',
    deviceId: 'device-kalupur-1',
    amount: 201,
    status: 'REFUNDED',
    createdAt: hoursAgo(24 * 18),
    category: categories[0],
    refundedAmount: 201,
    donorName: 'Guest donor',
  }),
  donation({
    id: 'don-1010',
    templeId: 'temple-chicago',
    deviceId: 'device-chicago-1',
    amount: 81,
    status: 'CANCELED',
    createdAt: hoursAgo(24 * 3),
    category: categories[1],
  }),
]

const earlierTemples = ['temple-kalupur', 'temple-chicago', 'temple-nj']
for (let i = 0; i < 36; i += 1) {
  const templeId = earlierTemples[i % earlierTemples.length]
  donations.push(
    donation({
      id: `don-earlier-${i + 1}`,
      templeId,
      deviceId: templeId === 'temple-kalupur' ? 'device-kalupur-1' : templeId === 'temple-chicago' ? 'device-chicago-1' : 'device-nj-1',
      amount: 45 + (i % 5) * 10,
      status: 'SUCCEEDED',
      createdAt: hoursAgo(24 * (32 + (i % 24))),
      category: categories[i % categories.length],
      donorName: 'Earlier donor',
    }),
  )
}

const devices = [
  {
    id: 'device-kalupur-1',
    label: 'Kalupur lobby',
    deviceCode: 'KLP-01',
    templeId: 'temple-kalupur',
    status: 'ACTIVE',
    lastSeenAt: hoursAgo(0.2),
    deviceToken: 'tok-kalupur-1',
    createdAt: hoursAgo(24 * 200),
    activatedAt: hoursAgo(24 * 190),
    readerConnected: true,
  },
  {
    id: 'device-kalupur-2',
    label: 'Kalupur sabha hall',
    deviceCode: 'KLP-02',
    templeId: 'temple-kalupur',
    status: 'ACTIVE',
    lastSeenAt: hoursAgo(3),
    deviceToken: 'tok-kalupur-2',
    createdAt: hoursAgo(24 * 120),
    activatedAt: hoursAgo(24 * 110),
    readerConnected: false,
  },
  {
    id: 'device-chicago-1',
    label: 'Chicago foyer',
    deviceCode: 'CHI-01',
    templeId: 'temple-chicago',
    status: 'ACTIVE',
    lastSeenAt: hoursAgo(0.1),
    deviceToken: 'tok-chicago-1',
    createdAt: hoursAgo(24 * 90),
    activatedAt: hoursAgo(24 * 80),
    readerConnected: true,
  },
  {
    id: 'device-nj-1',
    label: 'New Jersey main',
    deviceCode: 'NJ-01',
    templeId: 'temple-nj',
    status: 'ACTIVE',
    lastSeenAt: hoursAgo(24 * 3),
    deviceToken: 'tok-nj-1',
    createdAt: hoursAgo(24 * 60),
    activatedAt: hoursAgo(24 * 50),
    readerConnected: false,
  },
  {
    id: 'device-nj-2',
    label: 'New Jersey spare',
    deviceCode: 'NJ-02',
    templeId: 'temple-nj',
    status: 'PENDING',
    lastSeenAt: null as string | null,
    deviceToken: null as string | null,
    createdAt: hoursAgo(24 * 2),
    activatedAt: null as string | null,
    readerConnected: null as boolean | null,
  },
]

const users = [
  {
    id: 'user-dev',
    name: 'Dev Admin',
    email: 'dev@localhost',
    role: 'MASTER_ADMIN',
    templeId: null as string | null,
    temple: null as { name: string } | null,
  },
  {
    id: 'user-kalupur',
    name: 'Kalupur Admin',
    email: 'kalupur@example.com',
    role: 'TEMPLE_ADMIN',
    templeId: 'temple-kalupur',
    temple: { name: 'Shree Swaminarayan Mandir, Kalupur' },
  },
  {
    id: 'user-chicago',
    name: 'Chicago Admin',
    email: 'chicago@example.com',
    role: 'TEMPLE_ADMIN',
    templeId: 'temple-chicago',
    temple: { name: 'ISSO Chicago' },
  },
]

const events = [
  {
    id: 'event-poonam',
    name: 'Poonam',
    description: 'Full moon observance',
    date: hoursAgo(-24 * 10),
    startTime: '18:00',
    isRecurring: true,
    recurrencePattern: 'Monthly',
    displayOrder: 1,
    isActive: true,
    googleCalendarLinks: [],
    createdAt: hoursAgo(24 * 30),
    updatedAt: hoursAgo(24 * 2),
  },
  {
    id: 'event-ekadashi',
    name: 'Ekadashi',
    description: 'Fasting day',
    date: hoursAgo(-24 * 4),
    startTime: '06:00',
    isRecurring: true,
    recurrencePattern: 'Twice monthly',
    displayOrder: 2,
    isActive: true,
    googleCalendarLinks: [],
    createdAt: hoursAgo(24 * 30),
    updatedAt: hoursAgo(24 * 2),
  },
]

const changeRequests = [
  {
    id: 'change-1',
    status: 'PENDING',
    templeId: 'temple-nj',
    donationId: 'don-1002',
    temple: { name: 'ISSO New Jersey' },
    createdAt: hoursAgo(4),
    templeNote: 'Donor spelled the family name wrong on the kiosk.',
    requestedByUser: { name: 'Kalupur Admin', email: 'kalupur@example.com' },
    previousSnapshot: {
      donorName: 'Vijay Patel',
      donorPhone: '7325550142',
      donorEmail: 'vijay.patel@example.com',
      donorAddress: null,
      donorId: 'donor-1',
    },
    proposedSnapshot: {
      donorName: 'Vijay R. Patel',
      donorPhone: '7325550142',
      donorEmail: 'vijay.patel@example.com',
      donorAddress: '14 Temple St, Edison, NJ',
      donorId: 'donor-1',
    },
  },
]

function withTemple<T extends { templeId: string }>(row: T) {
  return { ...row, temple: { id: row.templeId, name: templeName(row.templeId) } }
}

function parseBody(config: InternalAxiosRequestConfig) {
  const raw = config.data
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw as Record<string, unknown>
}

function paramsOf(config: InternalAxiosRequestConfig) {
  return (config.params || {}) as Record<string, string | undefined>
}

function inRange(iso: string, start?: string, end?: string) {
  const time = new Date(iso).getTime()
  if (start && time < new Date(start).getTime()) return false
  if (end && time > new Date(end).getTime()) return false
  return true
}

function keptAmount(row: DummyDonation) {
  return Math.max(0, Number(row.amount) - Number(row.refundedAmount || 0))
}

function filterDonations(config: InternalAxiosRequestConfig) {
  const params = paramsOf(config)
  return donations.filter((row) => {
    if (params.templeId && row.templeId !== params.templeId) return false
    if (params.status && row.status !== params.status) return false
    if (!inRange(row.createdAt, params.startDate, params.endDate)) return false
    return true
  })
}

function statsFor(config: InternalAxiosRequestConfig) {
  const rows = filterDonations(config).filter((row) => row.status === 'SUCCEEDED')
  const total = rows.reduce((sum, row) => sum + keptAmount(row), 0)
  return { total: Math.round(total * 100) / 100, count: rows.length }
}

function overviewFor(config: InternalAxiosRequestConfig) {
  const rows = filterDonations(config).filter((row) => row.status === 'SUCCEEDED')
  const dailyMap = new Map<string, { amount: number; count: number }>()
  const templeMap = new Map<string, { templeName: string; total: number; count: number }>()
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10)
    const daily = dailyMap.get(day) || { amount: 0, count: 0 }
    daily.amount += keptAmount(row)
    daily.count += 1
    dailyMap.set(day, daily)
    const temple = templeMap.get(row.templeId) || { templeName: row.temple.name, total: 0, count: 0 }
    temple.total += keptAmount(row)
    temple.count += 1
    templeMap.set(row.templeId, temple)
  }
  return {
    daily: Array.from(dailyMap.entries())
      .map(([date, value]) => ({ date, amount: value.amount, count: value.count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byTemple: Array.from(templeMap.entries()).map(([templeId, value]) => ({
      templeId,
      templeName: value.templeName,
      total: value.total,
      count: value.count,
    })),
  }
}

function donorsForTemple(templeId: string, config: InternalAxiosRequestConfig) {
  const query = new URL(config.url || '', 'http://local').searchParams
  const search = (query.get('search') || '').toLowerCase()
  const segment = query.get('segment') || 'all'
  let rows = donors.filter((donor) => donor.templeId === templeId)
  if (search) {
    rows = rows.filter((donor) =>
      [donor.name, donor.email, donor.phone].some((value) => (value || '').toLowerCase().includes(search)),
    )
  }
  if (segment === 'recurring' || segment === 'high_value') {
    rows = rows.filter((donor) => donor.totalDonations >= 2 || donor.totalAmount >= 500)
  }
  if (segment === 'new') rows = rows.filter((donor) => new Date(donor.createdAt).getTime() > Date.now() - 30 * 86400000)
  if (segment === 'anonymous') rows = rows.filter((donor) => !donor.name)
  const withTempleName = rows.map((donor) => ({ ...donor, temple: { name: templeName(donor.templeId) } }))
  return { donors: withTempleName, total: withTempleName.length }
}

function donorStats(templeId: string) {
  const rows = donors.filter((donor) => donor.templeId === templeId)
  const totalGifts = rows.reduce((sum, donor) => sum + donor.totalDonations, 0)
  const withGifts = rows.filter((donor) => donor.totalDonations > 0).length
  return {
    total: rows.length,
    totalDonated: rows.reduce((sum, donor) => sum + donor.totalAmount, 0),
    totalGifts,
    newThisMonth: rows.filter((donor) => new Date(donor.createdAt).getTime() > Date.now() - 30 * 86400000).length,
    firstGiftThisMonth: 1,
    averageGiftsPerDonor: withGifts ? Math.round((totalGifts / withGifts) * 10) / 10 : 0,
    repeatCount: rows.filter((donor) => donor.totalDonations >= 2).length,
    activeCount: rows.filter((donor) => donor.lastDonationDate && Date.now() - new Date(donor.lastDonationDate).getTime() < 365 * 86400000).length,
  }
}

function handle(config: InternalAxiosRequestConfig): unknown {
  const [path] = (config.url || '').split('?')
  const method = (config.method || 'get').toLowerCase()
  const body = parseBody(config)

  if (method === 'get' && path === '/temples') {
    return temples.map((temple) => ({
      ...temple,
      devices: devices.filter((device) => device.templeId === temple.id),
    }))
  }
  if (method === 'get' && path.startsWith('/temples/')) {
    const temple = temples.find((item) => item.id === path.split('/')[2])
    return temple ? { ...temple } : {}
  }
  if (method === 'post' && path === '/temples') {
    const created = {
      id: `temple-${temples.length + 1}`,
      name: String(body.name || 'New temple'),
      address: String(body.address || ''),
      timezone: 'America/New_York',
      stripeAccountId: null,
      stripePublishableKey: null,
    }
    temples.push(created)
    return created
  }

  if (method === 'get' && path === '/devices') {
    const templeId = paramsOf(config).templeId
    return devices
      .filter((device) => !templeId || device.templeId === templeId)
      .map((device) => withTemple(device))
  }
  if (method === 'get' && /^\/devices\/[^/]+$/.test(path)) {
    const device = devices.find((item) => item.id === path.split('/')[2])
    return device ? withTemple(device) : {}
  }
  if (method === 'get' && path.endsWith('/telemetry/latest')) {
    return { batteryLevel: 86, readerConnected: true, appVersion: '1.4.2', recordedAt: hoursAgo(0.2) }
  }
  if (method === 'get' && path.includes('/telemetry')) return []
  if (method === 'get' && path.endsWith('/logs')) return []
  if (method === 'patch' && path.endsWith('/deactivate')) {
    const device = devices.find((item) => item.id === path.split('/')[2])
    if (device) device.status = 'INACTIVE'
    return { ok: true }
  }
  if (method === 'patch' && path.endsWith('/reactivate')) {
    const device = devices.find((item) => item.id === path.split('/')[2])
    if (device) device.status = 'ACTIVE'
    return { ok: true }
  }

  if (method === 'get' && path === '/donations/stats') return statsFor(config)
  if (method === 'get' && path === '/donations/overview') return overviewFor(config)
  if (method === 'get' && path === '/donations') return filterDonations(config)
  if (method === 'get' && path.includes('/payment-details')) {
    return { paymentStatus: 'succeeded', netAmount: 96.5, stripeFee: 3.5, cardType: 'visa', cardLast4: '4242' }
  }
  if (method === 'post' && path.endsWith('/refund')) {
    const donationId = path.split('/')[2]
    const row = donations.find((item) => item.id === donationId)
    const requested = Number(body.amount)
    const remaining = row ? keptAmount(row) : 0
    const refundAmount = Number.isFinite(requested) && requested > 0 ? requested : remaining
    if (row) {
      row.refundedAmount = Math.round((Number(row.refundedAmount) + refundAmount) * 100) / 100
      if (keptAmount(row) <= 0.009) row.status = 'REFUNDED'
    }
    return { refundId: `re_${donationId}`, refundAmount }
  }
  if (method === 'post' && (path.includes('/resend-receipt') || path.includes('/cleanup/') || path.endsWith('/cancel'))) {
    return { updated: 0, deleted: 0, failed: 0, message: 'Sample data only' }
  }

  if (method === 'get' && path === '/users') {
    return users.map((user) => ({ ...user, temple: user.templeId ? { name: templeName(user.templeId) } : null }))
  }
  if (method === 'post' && path === '/users') {
    const templeId = body.templeId ? String(body.templeId) : null
    const created = {
      id: `user-${users.length + 1}`,
      name: String(body.name || 'New user'),
      email: String(body.email || 'new@example.com'),
      role: String(body.role || 'TEMPLE_ADMIN'),
      templeId,
      temple: templeId ? { name: templeName(templeId) } : null,
    }
    users.push(created)
    return created
  }

  if (method === 'get' && /^\/donors\/temple\/[^/]+\/stats$/.test(path)) {
    return donorStats(path.split('/')[3])
  }
  if (method === 'get' && /^\/donors\/temple\/[^/]+$/.test(path)) {
    return donorsForTemple(path.split('/')[3], config)
  }
  if (method === 'post' && path === '/donors') {
    const templeId = String(body.templeId || 'temple-kalupur')
    const created = {
      id: `donor-${donors.length + 1}`,
      name: body.name ? String(body.name) : null,
      phone: String(body.phone || '5550000000'),
      email: body.email ? String(body.email) : null,
      address: body.address ? String(body.address) : null,
      templeId,
      totalDonations: 0,
      totalAmount: 0,
      lastDonationDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    donors.push(created)
    return created
  }

  if (method === 'get' && path === '/religious-events') return events
  if (method === 'post' && path === '/religious-events') {
    const created = { id: `event-${events.length + 1}`, ...body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    events.push(created as (typeof events)[number])
    return created
  }
  if (method === 'patch' && path.startsWith('/religious-events/')) {
    const event = events.find((item) => item.id === path.split('/')[2])
    if (event) Object.assign(event, body, { updatedAt: new Date().toISOString() })
    return event || {}
  }
  if (method === 'delete' && path.startsWith('/religious-events/')) {
    const index = events.findIndex((item) => item.id === path.split('/')[2])
    if (index >= 0) events.splice(index, 1)
    return { ok: true }
  }

  if (method === 'get' && path === '/donation-change-requests') {
    const status = paramsOf(config).status
    const templeId = paramsOf(config).templeId
    return changeRequests.filter((request) => {
      if (status && request.status !== status) return false
      if (templeId && request.templeId !== templeId) return false
      return true
    })
  }
  if (method === 'post' && path.endsWith('/approve')) {
    const request = changeRequests.find((item) => item.id === path.split('/')[2])
    if (request) request.status = 'APPROVED'
    return { ok: true }
  }
  if (method === 'post' && path.endsWith('/reject')) {
    const request = changeRequests.find((item) => item.id === path.split('/')[2])
    if (request) request.status = 'REJECTED'
    return { ok: true }
  }

  if (method === 'get') return []
  return { ok: true }
}

export function isDevDummySession() {
  return (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    localStorage.getItem('authToken') === 'dev-bypass'
  )
}

export function dummyResponse(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    data: handle(config),
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}
