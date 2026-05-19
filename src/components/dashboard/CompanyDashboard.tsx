"use client"
import { useState } from "react"
import { TodayOverview }    from "./widgets/TodayOverview"
import { ApprovalsWidget }  from "./widgets/ApprovalsWidget"
import { KpiRow }           from "./widgets/KpiRow"
import { CalendarWidget }   from "./widgets/CalendarWidget"
import { QuickActions }     from "./widgets/QuickActions"
import { RevenueChart }     from "./widgets/RevenueChart"
import { TopCustomers }     from "./widgets/TopCustomers"
import { RecentActivity }   from "./widgets/RecentActivity"
import { DashboardHeader }  from "./DashboardHeader"
import { CustomizeModal }   from "./CustomizeModal"
import { CalendarEventModal } from "./widgets/CalendarEventModal"
import { useDashboardPreferences } from "@/lib/dashboard/use-dashboard-preferences"
import type { WidgetId } from "@/lib/dashboard/widget-config"

interface Props {
  orgSlug:  string
  userName: string
}

export function CompanyDashboard({ orgSlug, userName }: Props) {
  const { hidden, loaded, save } = useDashboardPreferences()
  const [showCustomize,   setShowCustomize]   = useState(false)
  const [showEventModal,  setShowEventModal]  = useState(false)
  const [calendarRefresh, setCalendarRefresh] = useState(0)

  function isVisible(id: WidgetId) {
    return !loaded || !hidden.includes(id)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <DashboardHeader onCustomize={() => setShowCustomize(true)} />

      <div className="space-y-5">
        {(isVisible("today-overview") || isVisible("approvals")) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {isVisible("today-overview") && (
              <div className="lg:col-span-2">
                <TodayOverview userName={userName} />
              </div>
            )}
            {isVisible("approvals") && (
              <div>
                <ApprovalsWidget orgSlug={orgSlug} />
              </div>
            )}
          </div>
        )}

        {isVisible("kpi-row") && <KpiRow orgSlug={orgSlug} />}

        {(isVisible("calendar") || isVisible("quick-actions")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {isVisible("calendar") && (
              <CalendarWidget key={calendarRefresh} orgSlug={orgSlug} />
            )}
            {isVisible("quick-actions") && (
              <QuickActions orgSlug={orgSlug} onNewEvent={() => setShowEventModal(true)} />
            )}
          </div>
        )}

        {(isVisible("revenue-chart") || isVisible("top-customers")) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {isVisible("revenue-chart") && <RevenueChart orgSlug={orgSlug} />}
            {isVisible("top-customers") && <TopCustomers orgSlug={orgSlug} />}
          </div>
        )}

        {isVisible("recent-activity") && <RecentActivity orgSlug={orgSlug} />}
      </div>

      <CustomizeModal
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        hidden={hidden}
        onSave={save}
      />

      <CalendarEventModal
        open={showEventModal}
        onClose={() => setShowEventModal(false)}
        onCreated={() => setCalendarRefresh(r => r + 1)}
      />
    </div>
  )
}
