'use client'

import LivePulse from './LivePulse'
import { WidgetSkeleton, WidgetEmptyState } from './WidgetShell'
import {
  activitySeverityClass,
  activityTypeIcon,
  IDLE_EVENT_ID,
  type ActivityEvent,
} from '@/hooks/useLiveActivity'

function ActivityIcon({ type }: { type: string }) {
  const kind = activityTypeIcon(type)
  const cls = 'w-4 h-4'
  if (kind === 'donation') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (kind === 'device') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }
  if (kind === 'payment') {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

interface LiveActivityFeedProps {
  events: (ActivityEvent & { timeAgo: string })[]
  isLoading?: boolean
}

export default function LiveActivityFeed({ events, isLoading }: LiveActivityFeedProps) {
  if (isLoading) {
    return <WidgetSkeleton lines={6} height="min-h-[360px]" />
  }

  const isEmpty =
    events.length === 0 || (events.length === 1 && events[0].id === IDLE_EVENT_ID)

  return (
    <div className="dashboard-card h-full flex flex-col min-h-[320px] xl:min-h-[360px] overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100/90 shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Live activity</h3>
          <p className="text-xs text-gray-500 mt-0.5">Real-time platform events</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
          <LivePulse />
          Live
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 max-h-[420px] custom-scrollbar min-h-0">
        {isEmpty ? (
          <WidgetEmptyState title="No recent activity" description="Events will appear here as they occur." icon="inbox" />
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${activitySeverityClass(event.severity)}`}
              >
                <ActivityIcon type={event.type} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 leading-snug">{event.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {event.actor}
                  {event.temple ? ` · ${event.temple}` : ''}
                </p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 self-start pt-0.5">
                {event.timeAgo}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
