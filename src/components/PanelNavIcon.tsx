import { Icon } from "@iconify/react"
import {
  CalendarDays,
  CloudSun,
  Gamepad2,
  LayoutDashboard,
  Leaf,
  LineChart,
  Settings,
  Timer,
  Volume2,
} from "lucide-react"
import type { NotchPanel } from "../lib/panel-routing"

type Props = {
  panel: NotchPanel
  className?: string
}

export function PanelNavIcon({ panel, className = "size-4" }: Props) {
  switch (panel) {
    case "overview":
      return <LayoutDashboard className={className} strokeWidth={1.75} />
    case "weather":
      return <CloudSun className={className} strokeWidth={1.75} />
    case "spotify":
      return <Icon icon="simple-icons:spotify" className={className} aria-hidden />
    case "media":
      return <Icon icon="simple-icons:youtube" className={className} aria-hidden />
    case "air":
      return <Leaf className={className} strokeWidth={1.75} />
    case "calendar":
      return <CalendarDays className={className} strokeWidth={1.75} />
    case "cursor":
      return <Icon icon="simple-icons:cursor" className={className} aria-hidden />
    case "clock":
      return <Timer className={className} strokeWidth={1.75} />
    case "pacman":
      return <Gamepad2 className={className} strokeWidth={1.75} />
    case "markets":
      return <LineChart className={className} strokeWidth={1.75} />
    case "github":
      return <Icon icon="simple-icons:github" className={className} aria-hidden />
    case "strava":
      return <Icon icon="simple-icons:strava" className={className} aria-hidden />
    case "mint":
      return <Icon icon="simple-icons:linuxmint" className={className} aria-hidden />
    case "wifi-sense":
      return <Icon icon="mdi:wifi-strength-2" className={className} aria-hidden />
    case "pi":
      return <Icon icon="simple-icons:raspberrypi" className={className} aria-hidden />
    case "controls":
      return <Volume2 className={className} strokeWidth={1.75} />
    case "settings":
      return <Settings className={className} strokeWidth={1.75} />
    default:
      return null
  }
}
