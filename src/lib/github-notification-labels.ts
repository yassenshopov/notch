import type { GitHubNotification } from "./github"

export function resolveNotificationActionLabel(n: GitHubNotification): string {
  if (n.actionLabel) return n.actionLabel
  const reason = n.reason
  const map: Record<string, string> = {
    assign: "Assigned to you",
    author: "Your activity",
    comment: "New comment",
    invitation: "Invitation",
    manual: "Subscribed",
    mention: "Mentioned you",
    review_requested: "Review requested",
    security_alert: "Security alert",
    state_change: "Status changed",
    subscribed: "New activity",
    team_mention: "Team mention",
  }
  if (reason && map[reason]) return map[reason]
  return n.subjectTypeLabel ?? "Notification"
}

export function resolveNotificationSubjectTypeLabel(n: GitHubNotification): string {
  if (n.subjectTypeLabel) return n.subjectTypeLabel
  if (n.subjectType === "PullRequest") return "Pull request"
  if (n.subjectType === "Issue") return "Issue"
  return n.subjectType ?? "Update"
}

export function splitRepoPath(full: string) {
  const i = full.indexOf("/")
  if (i <= 0) return { owner: full, name: full }
  return { owner: full.slice(0, i), name: full.slice(i + 1) }
}