import { Problem } from '../data/types';

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (Number.isNaN(diffMs)) return 'Recently';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/** "1. Two Sum" for catalog problems; just the title for ones outside the catalog. */
export function problemLabel(problem: Problem): string {
  return problem.frontend_id > 0 ? `${problem.frontend_id}. ${problem.title}` : problem.title;
}
