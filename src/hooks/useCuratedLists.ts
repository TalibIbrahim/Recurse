import { useState, useMemo, useCallback } from 'react';
import {
  CuratedList,
  CuratedListId,
  CuratedListProgress,
  Problem,
} from '../data/types';
import { CURATED_LISTS, SEED_PROBLEMS } from '../data/problemsSeed';
import { useAttempts } from './useAttempts';

export interface UseCuratedListsReturn {
  readonly selectedListId: CuratedListId;
  readonly setSelectedListId: (id: CuratedListId) => void;
  readonly selectedList: CuratedList;
  readonly curatedLists: readonly CuratedList[];
  readonly progress: CuratedListProgress;
  readonly problems: readonly Problem[];
  readonly isProblemInCurrentList: (slugOrId: string) => boolean;
  readonly isProblemSolved: (problemId: string) => boolean;
}

/**
 * Hook to manage curated problem lists (Blind 75, NeetCode 150, Grind 75, LeetCode Top 150),
 * tracking solve progress, difficulty breakdowns, and problem filtering.
 */
export function useCuratedLists(currentUserId?: string): UseCuratedListsReturn {
  const [selectedListId, setSelectedListId] = useState<CuratedListId>('blind75');
  const { attempts } = useAttempts(currentUserId);

  const selectedList = useMemo<CuratedList>(() => {
    return (
      CURATED_LISTS.find((l) => l.id === selectedListId) || CURATED_LISTS[0]
    );
  }, [selectedListId]);

  const slugSet = useMemo<Set<string>>(() => {
    return new Set(selectedList.problem_slugs);
  }, [selectedList]);

  // Catalog problems that are in the selected list
  const listProblems = useMemo<readonly Problem[]>(() => {
    return SEED_PROBLEMS.filter((p) => slugSet.has(p.leetcode_slug));
  }, [slugSet]);

  // Set of solved problem IDs
  const solvedProblemIdSet = useMemo<Set<string>>(() => {
    const ids = new Set<string>();
    for (const att of attempts) {
      if (att.status === 'solved') {
        ids.add(att.problem_id);
      }
    }
    return ids;
  }, [attempts]);

  const isProblemSolved = useCallback(
    (problemId: string): boolean => {
      return solvedProblemIdSet.has(problemId);
    },
    [solvedProblemIdSet]
  );

  const isProblemInCurrentList = useCallback(
    (slugOrId: string): boolean => {
      return (
        slugSet.has(slugOrId) ||
        listProblems.some((p) => p.id === slugOrId)
      );
    },
    [slugSet, listProblems]
  );

  const progress = useMemo<CuratedListProgress>(() => {
    const total = selectedList.problem_slugs.length;
    let solved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const prob of listProblems) {
      if (solvedProblemIdSet.has(prob.id)) {
        solved += 1;
        if (prob.difficulty === 'Easy') easySolved += 1;
        else if (prob.difficulty === 'Medium') mediumSolved += 1;
        else if (prob.difficulty === 'Hard') hardSolved += 1;
      }
    }

    const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;

    return {
      list_id: selectedListId,
      total,
      solved,
      percentage,
      easy_solved: easySolved,
      medium_solved: mediumSolved,
      hard_solved: hardSolved,
    };
  }, [selectedList, listProblems, solvedProblemIdSet, selectedListId]);

  return {
    selectedListId,
    setSelectedListId,
    selectedList,
    curatedLists: CURATED_LISTS,
    progress,
    problems: listProblems,
    isProblemInCurrentList,
    isProblemSolved,
  };
}
