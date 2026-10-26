import { Notch } from "./components/Notch"
import { TimerEngineProvider } from "./hooks/useTimerEngine"

export default function App() {
  return (
    <TimerEngineProvider>
      <main className="block h-full w-full min-h-0 overflow-hidden bg-transparent">
        <Notch />
      </main>
    </TimerEngineProvider>
  )
}
