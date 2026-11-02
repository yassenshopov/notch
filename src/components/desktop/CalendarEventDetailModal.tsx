import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  Users,
  Video,
  X,
} from "lucide-react"
import type { ClockFormat } from "../../config/settings"
import {
  attendeeStatusLabel,
  formatEventSchedule,
  mapsUrlForLocation,
  openCalendarUrl,
  type CalendarEvent,
} from "../../lib/calendar"
import { eventDisplayColor } from "../../lib/google-calendar-colors"
import { notchUi } from "../../lib/island-motion"
import { cn } from "../../lib/utils"

type Props = {
  event: CalendarEvent | null
  open: boolean
  onClose: () => void
  clockFormat: ClockFormat
}

export function CalendarEventDetailModal({ event, open, onClose, clockFormat }: Props) {
  const [displayEvent, setDisplayEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (event) setDisplayEvent(event)
  }, [event])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!displayEvent && !open) return null

  const color = displayEvent ? eventDisplayColor(displayEvent) : "#4285f4"
  const schedule = displayEvent ? formatEventSchedule(displayEvent, clockFormat) : ""
  const mapsUrl =
    displayEvent?.location ? mapsUrlForLocation(displayEvent.location) : null
  const guests = displayEvent?.attendees?.filter((a) => a.email) ?? []
  const organizer =
    displayEvent?.organizerName?.trim() ||
    displayEvent?.organizerEmail?.trim() ||
    null

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (!open) setDisplayEvent(null)
      }}
    >
      {open && displayEvent ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={notchUi}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="flex max-h-[min(32rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-event-title"
          >
        <div className="h-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden />
        <div className="flex items-start gap-2 border-b border-black/8 px-4 py-3 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <h2
              id="calendar-event-title"
              className="text-[18px] font-semibold leading-snug tracking-tight text-black/90 dark:text-white/95"
            >
              {displayEvent.summary}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="notch-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <DetailRow icon={<Clock className="size-4" />} label={schedule} />

          {displayEvent.calendarName ? (
            <DetailRow
              icon={<Calendar className="size-4" />}
              label={
                <span className="inline-flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {displayEvent.calendarName}
                </span>
              }
            />
          ) : null}

          {displayEvent.location ? (
            <DetailRow
              icon={<MapPin className="size-4" />}
              label={
                mapsUrl ? (
                  <button
                    type="button"
                    className="text-left text-[#1a73e8] hover:underline dark:text-[#8ab4f8]"
                    onClick={() => void openCalendarUrl(mapsUrl)}
                  >
                    {displayEvent.location}
                  </button>
                ) : (
                  displayEvent.location
                )
              }
            />
          ) : null}

          {organizer ? (
            <DetailRow
              icon={<Users className="size-4" />}
              label={
                <span>
                  <span className="text-black/45 dark:text-white/45">Organizer · </span>
                  {organizer}
                </span>
              }
            />
          ) : null}

          {guests.length > 0 ? (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                Guests ({guests.length})
              </p>
              <ul className="space-y-1.5">
                {guests.map((guest) => (
                  <li
                    key={guest.email}
                    className="flex items-center justify-between gap-2 text-[13px] text-black/75 dark:text-white/80"
                  >
                    <span className="min-w-0 truncate">
                      {guest.name?.trim() || guest.email}
                      {guest.optional ? (
                        <span className="text-black/35 dark:text-white/35"> · Optional</span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium tabular-nums",
                        guest.responseStatus === "accepted" && "text-emerald-600 dark:text-emerald-400",
                        guest.responseStatus === "declined" && "text-red-500 dark:text-red-400",
                        guest.responseStatus === "tentative" && "text-amber-600 dark:text-amber-400",
                        !guest.responseStatus || guest.responseStatus === "needsAction"
                          ? "text-black/45 dark:text-white/50"
                          : "",
                      )}
                    >
                      {attendeeStatusLabel(guest.responseStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {displayEvent.description ? (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                Description
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-black/75 dark:text-white/80">
                {displayEvent.description}
              </p>
            </section>
          ) : null}

          {displayEvent.status && displayEvent.status !== "confirmed" ? (
            <p className="text-[12px] capitalize text-black/45 dark:text-white/45">
              Status: {displayEvent.status}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-black/8 px-4 py-3 dark:border-white/10">
          {displayEvent.joinUrl ? (
            <button
              type="button"
              onClick={() => void openCalendarUrl(displayEvent.joinUrl!)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              <Video className="size-4" strokeWidth={2} />
              Join with Google Meet
            </button>
          ) : null}
          {displayEvent.htmlLink ? (
            <button
              type="button"
              onClick={() => void openCalendarUrl(displayEvent.htmlLink!)}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-[13px] font-semibold text-black/80 hover:bg-black/5 dark:border-white/15 dark:text-white/85 dark:hover:bg-white/10"
            >
              <ExternalLink className="size-4" />
              Open in Google Calendar
            </button>
          ) : null}
        </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function DetailRow({
  icon,
  label,
}: {
  icon: ReactNode
  label: ReactNode
}) {
  return (
    <div className="flex gap-3 text-[13px] leading-snug text-black/80 dark:text-white/85">
      <span className="mt-0.5 shrink-0 text-black/40 dark:text-white/40">{icon}</span>
      <div className="min-w-0 flex-1">{label}</div>
    </div>
  )
}
