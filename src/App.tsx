import { Notch } from "./components/Notch"
import { TimerEngineProvider } from "./hooks/useTimerEngine"

export default function App() {
  return (
    <TimerEngineProvider>
      <main className="h-screen w-screen overflow-visible bg-transparent">
        <Notch />
      </main>
    </TimerEngineProvider>
  )
}
