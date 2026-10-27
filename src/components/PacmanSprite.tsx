import type { Direction } from "../lib/pacman"
import { pacmanMouthRotation } from "../lib/pacman"
import { cn } from "../lib/utils"

type Props = {
  dir: Direction
  active: boolean
}

export function PacmanSprite({ dir, active }: Props) {
  return (
    <span
      className="absolute inset-[5%] flex items-center justify-center"
      style={{ transform: `rotate(${pacmanMouthRotation(dir)}deg)` }}
    >
      <span
        className={cn(
          "h-full w-full rounded-full bg-amber-400 dark:bg-yellow-400",
          active && "pacman-chomp",
        )}
      />
    </span>
  )
}
