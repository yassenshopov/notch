import {
  Bluetooth,
  Mic,
  MicOff,
  Monitor,
  Speaker,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { ReactNode } from "react"
import { useSystemControls } from "../hooks/useSystemControls"
import { cn } from "../lib/utils"

type Props = {
  active: boolean
}

export function ControlsPanel({ active }: Props) {
  const {
    status,
    loading,
    setVolume,
    setMuted,
    setMicMuted,
    setBrightness,
    setPlayback,
    setBluetooth,
  } = useSystemControls(active)

  if (!status.supported && !loading) {
    const onWindows =
      status.platform === "win32" || window.notch?.platform === "win32"
    let message = "Quick controls are Windows-only for now."
    if (status.error === "no_electron") {
      message = "Run Notch with Electron (npm run dev), not the browser."
    } else if (status.error === "controls_unavailable" || onWindows) {
      message =
        "Controls bridge missing — fully quit Notch and restart npm run dev."
    } else if (status.error) {
      message = `Controls unavailable (${status.error}).`
    }

    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-black/40 dark:text-white/40">
        {message}
      </div>
    )
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 pr-10">
        <p className="text-[15px] font-semibold tracking-tight">Controls</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Volume, display, mic & devices.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <ControlRow
          icon={
            status.muted || status.volume === 0 ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )
          }
          label="Volume"
          value={`${status.volume}%`}
          action={
            <IconToggle
              pressed={status.muted}
              label={status.muted ? "Unmute" : "Mute"}
              onClick={() => void setMuted(!status.muted)}
            >
              {status.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </IconToggle>
          }
        >
          <Slider
            value={status.muted ? 0 : status.volume}
            onChange={setVolume}
            ariaLabel="Volume"
          />
        </ControlRow>

        {status.brightnessSupported ? (
          <ControlRow
            icon={<Monitor className="size-4" />}
            label="Brightness"
            value={`${status.brightness ?? 0}%`}
          >
            <Slider
              value={status.brightness ?? 0}
              onChange={setBrightness}
              ariaLabel="Brightness"
            />
          </ControlRow>
        ) : null}

        <ControlRow
          icon={
            status.micMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />
          }
          label="Microphone"
          value={status.micMuted ? "Muted" : "Live"}
          action={
            <IconToggle
              pressed={status.micMuted}
              label={status.micMuted ? "Unmute mic" : "Mute mic"}
              onClick={() => void setMicMuted(!status.micMuted)}
              danger={status.micMuted}
            >
              {status.micMuted ? (
                <MicOff className="size-3.5" />
              ) : (
                <Mic className="size-3.5" />
              )}
            </IconToggle>
          }
        />

        {status.playback.length > 0 ? (
          <section>
            <RowLabel icon={<Speaker className="size-3.5" />} title="Output" />
            <div className="mt-1.5 flex flex-col gap-1">
              {status.playback.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => void setPlayback(device.friendlyId || device.id)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] transition-colors",
                    device.isDefault
                      ? "bg-black/8 font-semibold dark:bg-white/12"
                      : "hover:bg-black/4 dark:hover:bg-white/6",
                  )}
                >
                  <span className="truncate">{device.name}</span>
                  {device.isDefault ? (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                      Default
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {status.bluetooth.length > 0 ? (
          <section className="pb-2">
            <RowLabel icon={<Bluetooth className="size-3.5" />} title="Bluetooth" />
            <div className="mt-1.5 flex flex-col gap-1">
              {status.bluetooth.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => void setBluetooth(device.id, !device.connected)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] transition-colors",
                    device.connected
                      ? "bg-black/8 dark:bg-white/12"
                      : "hover:bg-black/4 dark:hover:bg-white/6",
                  )}
                >
                  <span className="truncate font-medium">{device.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                      device.connected
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-black/35 dark:text-white/35",
                    )}
                  >
                    {device.connected ? "On" : "Off"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function ControlRow({
  icon,
  label,
  value,
  action,
  children,
}: {
  icon: ReactNode
  label: string
  value: string
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-black/45 dark:text-white/45">{icon}</span>
        <span className="text-[12px] font-medium">{label}</span>
        <span className="ml-auto text-[11px] tabular-nums text-black/40 dark:text-white/40">
          {value}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

function RowLabel({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-black/45 dark:text-white/45">
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-[0.12em]">{title}</span>
    </div>
  )
}

function Slider({
  value,
  onChange,
  ariaLabel,
}: {
  value: number
  onChange: (v: number) => void
  ariaLabel: string
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className="notch-slider w-full"
    />
  )
}

function IconToggle({
  pressed,
  label,
  onClick,
  children,
  danger,
}: {
  pressed: boolean
  label: string
  onClick: () => void
  children: ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "ml-1 rounded-full p-1.5 transition-colors",
        pressed
          ? danger
            ? "bg-red-500/15 text-red-500"
            : "bg-black/10 dark:bg-white/15"
          : "text-black/40 hover:bg-black/5 hover:text-black/70 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/80",
      )}
    >
      {children}
    </button>
  )
}
