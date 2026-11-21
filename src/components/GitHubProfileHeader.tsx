import type { ReactNode } from "react"
import { openGitHubUrl, type GitHubProfile } from "../lib/github"
import { cn } from "../lib/utils"
import { AnimatedNumber } from "./AnimatedNumber"

type Props = {
  login: string
  loginLabel: string
  avatarUrl: string | null
  profile: GitHubProfile | null
  actions?: ReactNode
  className?: string
}

function profileStatUrl(profile: GitHubProfile, segment: "followers" | "following" | "repositories") {
  const base = profile.url.replace(/\/$/, "")
  return `${base}/${segment}`
}

export function GitHubProfileHeader({
  login,
  loginLabel,
  avatarUrl,
  profile,
  actions,
  className,
}: Props) {
  const displayName = profile?.name?.trim() || login
  const profileUrl = profile?.url ?? `https://github.com/${login}`

  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/25"
          aria-label="Open GitHub profile"
          onClick={() => openGitHubUrl(profileUrl)}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="size-11 rounded-full border border-black/10 dark:border-white/15"
            />
          ) : (
            <span className="block size-11 rounded-full bg-black/10 dark:bg-white/10" />
          )}
        </button>
        <div className="min-w-0 space-y-1.5">
          <div>
            <button
              type="button"
              onClick={() => openGitHubUrl(profileUrl)}
              className="text-left text-[22px] font-semibold tracking-tight hover:underline"
            >
              {displayName}
            </button>
            <p className="text-[13px] text-black/45 dark:text-white/45">{loginLabel}</p>
          </div>

          {profile ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-black/55 dark:text-white/55">
              <ProfileStat
                label="followers"
                value={profile.followers}
                onOpen={() => openGitHubUrl(profileStatUrl(profile, "followers"))}
              />
              <span className="text-black/25 dark:text-white/25" aria-hidden>
                ·
              </span>
              <ProfileStat
                label="following"
                value={profile.following}
                onOpen={() => openGitHubUrl(profileStatUrl(profile, "following"))}
              />
              <span className="text-black/25 dark:text-white/25" aria-hidden>
                ·
              </span>
              <ProfileStat
                label="repos"
                value={profile.publicRepos}
                onOpen={() => openGitHubUrl(profileStatUrl(profile, "repositories"))}
              />
            </div>
          ) : null}

          {profile?.bio ? (
            <p className="max-w-xl text-[13px] leading-snug text-black/60 dark:text-white/60 line-clamp-2">
              {profile.bio}
            </p>
          ) : null}

          {profile?.company || profile?.location || profile?.blog || profile?.twitterUsername ? (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-black/45 dark:text-white/45">
              {profile.company ? <span>{profile.company}</span> : null}
              {profile.location ? <span>{profile.location}</span> : null}
              {profile.blog ? (
                <BlogLink blog={profile.blog} />
              ) : null}
              {profile.twitterUsername ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => openGitHubUrl(`https://x.com/${profile.twitterUsername}`)}
                >
                  @{profile.twitterUsername}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}

function ProfileStat({
  label,
  value,
  onOpen,
}: {
  label: string
  value: number
  onOpen: () => void
}) {
  return (
    <button type="button" onClick={onOpen} className="inline-flex items-baseline gap-1 hover:underline">
      <AnimatedNumber value={value} format={(n) => n.toLocaleString()} className="text-[12px] font-semibold" />
      <span>{label}</span>
    </button>
  )
}

function BlogLink({ blog }: { blog: string }) {
  return (
    <button
      type="button"
      className="max-w-[14rem] truncate hover:underline"
      onClick={() => openGitHubUrl(normalizeBlogUrl(blog))}
    >
      {formatBlogLabel(blog)}
    </button>
  )
}

function normalizeBlogUrl(blog: string) {
  const trimmed = blog.trim()
  if (!trimmed) return blog
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function formatBlogLabel(blog: string) {
  return blog.replace(/^https?:\/\//i, "").replace(/\/$/, "")
}