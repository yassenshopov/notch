import { useCalendar } from "./useCalendar"
import { useCursor } from "./useCursor"
import { useGithub } from "./useGithub"
import { useMarkets } from "./useMarkets"
import { useMint } from "./useMint"
import { usePi } from "./usePi"
import { useStrava } from "./useStrava"
import { useWifiSense } from "./useWifiSense"
import type { notchIntegrationPolls } from "../lib/notch-poll"

type Polls = ReturnType<typeof notchIntegrationPolls>

export function useNotchIntegrations(polls: Polls) {
  const {
    calendarPoll,
    marketsPoll,
    githubPoll,
    stravaPoll,
    wifiSensePoll,
    mintPoll,
    piPoll,
    cursorPoll,
  } = polls

  const calendar = useCalendar(calendarPoll)
  const markets = useMarkets(marketsPoll)
  const github = useGithub(githubPoll)
  const strava = useStrava(stravaPoll)
  const mint = useMint(mintPoll)
  const pi = usePi(piPoll)
  const cursor = useCursor(cursorPoll)
  const wifiSense = useWifiSense(wifiSensePoll, {
    tailscaleIp: mint.status.tailscaleIp,
    lanIp: mint.status.lanIp,
  })

  return { calendar, markets, github, strava, mint, pi, cursor, wifiSense }
}