'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Inbox,
  Layers,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import styles from './ProblemList.module.css';
import ProblemCard from './ProblemCard';
import {
  Problem,
  Attempt,
  ProblemDifficulty,
  AttemptStatus,
  CuratedListId,
} from '../../data/types';
import { CURATED_LISTS } from '../../data/problemsSeed';

export interface ProblemListProps {
  problems: readonly Problem[];
  attempts: readonly Attempt[];
  onOpenLogModal: (problem: Problem, attempt?: Attempt) => void;
  onOpenDiscussion: (problem: Problem, attempt?: Attempt) => void;
  currentUserId?: string;
}

const COMPANY_TAGS = [
  'All',
  'Google',
  'Meta',
  'Amazon',
  'Microsoft',
  'Apple',
  'Bloomberg',
  'Uber',
  'Netflix',
] as const;

type CompanyTag = (typeof COMPANY_TAGS)[number];

export const ProblemList: React.FC<ProblemListProps> = ({
  problems,
  attempts,
  onOpenLogModal,
  onOpenDiscussion,
}) => {
  const [search, setSearch] = useState('');
  const [selectedListId, setSelectedListId] = useState<'all' | CuratedListId>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyTag>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<ProblemDifficulty | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<AttemptStatus | 'unsolved' | 'All'>('All');

  // Map problem_id to current user's attempt
  const attemptMap = useMemo(() => {
    const map = new Map<string, Attempt>();
    attempts.forEach((att) => {
      if (!map.has(att.problem_id)) {
        map.set(att.problem_id, att);
      }
    });
    return map;
  }, [attempts]);

  // Selected curated list metadata
  const currentCuratedList = useMemo(() => {
    if (selectedListId === 'all') return null;
    return CURATED_LISTS.find((l) => l.id === selectedListId) || null;
  }, [selectedListId]);

  // Slug set for active curated list
  const activeSlugSet = useMemo(() => {
    if (!currentCuratedList) return null;
    return new Set(currentCuratedList.problem_slugs);
  }, [currentCuratedList]);

  // Curated list progress computation
  const curatedProgress = useMemo(() => {
    if (!currentCuratedList || !activeSlugSet) {
      // Catalog-wide progress
      const total = problems.length;
      let solved = 0;
      let easySolved = 0;
      let mediumSolved = 0;
      let hardSolved = 0;

      for (const p of problems) {
        const att = attemptMap.get(p.id);
        if (att?.status === 'solved') {
          solved += 1;
          if (p.difficulty === 'Easy') easySolved += 1;
          else if (p.difficulty === 'Medium') mediumSolved += 1;
          else if (p.difficulty === 'Hard') hardSolved += 1;
        }
      }

      const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;
      return {
        name: 'All Problems Catalog',
        description: 'Complete inventory of categorized algorithmic interview challenges.',
        total,
        solved,
        percentage,
        easySolved,
        mediumSolved,
        hardSolved,
      };
    }

    const listProblems = problems.filter((p) => activeSlugSet.has(p.leetcode_slug));
    const total = currentCuratedList.problem_slugs.length;
    let solved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const p of listProblems) {
      const att = attemptMap.get(p.id);
      if (att?.status === 'solved') {
        solved += 1;
        if (p.difficulty === 'Easy') easySolved += 1;
        else if (p.difficulty === 'Medium') mediumSolved += 1;
        else if (p.difficulty === 'Hard') hardSolved += 1;
      }
    }

    const percentage = total > 0 ? Math.round((solved / total) * 100) : 0;
    return {
      name: currentCuratedList.name,
      description: currentCuratedList.description,
      total,
      solved,
      percentage,
      easySolved,
      mediumSolved,
      hardSolved,
    };
  }, [currentCuratedList, activeSlugSet, problems, attemptMap]);

  // Filtered problems list
  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      // 1. Curated list filter
      if (activeSlugSet && !activeSlugSet.has(problem.leetcode_slug)) {
        return false;
      }

      // 2. Company tag filter
      if (selectedCompany !== 'All') {
        if (!problem.company_tags || !problem.company_tags.includes(selectedCompany)) {
          return false;
        }
      }

      // 3. Text search on title, ID, and tags
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = problem.title.toLowerCase().includes(q);
        const matchesId = problem.frontend_id.toString().includes(q);
        const matchesTags = problem.tags.some((t) => t.toLowerCase().includes(q));
        const matchesCompany = problem.company_tags?.some((c) => c.toLowerCase().includes(q));
        if (!matchesTitle && !matchesId && !matchesTags && !matchesCompany) {
          return false;
        }
      }

      // 4. Difficulty filter
      if (difficultyFilter !== 'All' && problem.difficulty !== difficultyFilter) {
        return false;
      }

      // 5. Status filter
      if (statusFilter !== 'All') {
        const att = attemptMap.get(problem.id);
        const currentStatus = att ? att.status : 'unsolved';
        if (currentStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    problems,
    activeSlugSet,
    selectedCompany,
    attemptMap,
    search,
    difficultyFilter,
    statusFilter,
  ]);

  const resetFilters = () => {
    setSearch('');
    setSelectedListId('all');
    setSelectedCompany('All');
    setDifficultyFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className={styles.container}>
      {/* Control Bar */}
      <div className={styles.filtersBar}>
        {/* Curated List Switcher & Progress Header */}
        <section className={styles.curatedSection} aria-label="Curated Study Lists">
          <div className={styles.curatedHeaderRow}>
            <div className={styles.curatedSelector} role="tablist" aria-label="Select Curated List">
              <button
                type="button"
                role="tab"
                aria-selected={selectedListId === 'all'}
                className={`${styles.curatedTabBtn} ${
                  selectedListId === 'all' ? styles.curatedTabBtnActive : ''
                }`}
                onClick={() => setSelectedListId('all')}
              >
                <Layers size={14} />
                <span>All Problems</span>
              </button>

              {CURATED_LISTS.map((list) => {
                const isActive = selectedListId === list.id;
                return (
                  <button
                    key={list.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`${styles.curatedTabBtn} ${
                      isActive ? styles.curatedTabBtnActive : ''
                    }`}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <span>{list.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Header */}
          <div className={styles.curatedProgressHeader}>
            <div className={styles.progressInfoGroup}>
              <div className={styles.listTitleRow}>
                <span className={styles.listTitle}>{curatedProgress.name}</span>
                <CheckCircle2 size={14} className="text-accent-blue" />
              </div>
              <span className={styles.listDesc}>{curatedProgress.description}</span>
            </div>

            <div className={styles.progressStatsGroup}>
              <div className={styles.progressPercentageWrap}>
                <span className={styles.progressNumbers}>
                  {curatedProgress.solved}/{curatedProgress.total}
                </span>
                <span className={styles.progressRatio}>
                  solved · {curatedProgress.percentage}%
                </span>
              </div>

              <div
                className={styles.progressBarTrack}
                role="progressbar"
                aria-valuenow={curatedProgress.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${curatedProgress.name} completion progress`}
              >
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${curatedProgress.percentage}%` }}
                />
              </div>

              <div className={styles.difficultyBreakdown}>
                <span className={styles.diffStat} title="Easy solved">
                  <span className={styles.diffDotEasy} />
                  <span>{curatedProgress.easySolved}</span>
                </span>
                <span className={styles.diffStat} title="Medium solved">
                  <span className={styles.diffDotMedium} />
                  <span>{curatedProgress.mediumSolved}</span>
                </span>
                <span className={styles.diffStat} title="Hard solved">
                  <span className={styles.diffDotHard} />
                  <span>{curatedProgress.hardSolved}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Company-Tag Filter Pills Carousel */}
        <div className={styles.companySection} role="region" aria-label="Company Filter Pills">
          <Building2 size={14} className="text-label-tertiary" />
          <span className={styles.companyLabel}>Company:</span>
          {COMPANY_TAGS.map((comp) => {
            const isActive = selectedCompany === comp;
            return (
              <button
                key={comp}
                type="button"
                className={`${styles.companyPill} ${isActive ? styles.companyPillActive : ''}`}
                onClick={() => setSelectedCompany(comp)}
              >
                <span>{comp}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className={styles.searchRow}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search problems by title, LeetCode #, or topic tag (e.g. 'Two Sum', 'Array', 'DFS')..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search input"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Rows */}
        <div className={styles.filterRows}>
          {/* Difficulty Filters */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Difficulty:</span>
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                className={`${styles.filterPill} ${
                  difficultyFilter === diff ? styles.filterPillActive : ''
                }`}
                onClick={() => setDifficultyFilter(diff)}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Status:</span>
            {(['All', 'solved', 'attempted', 'needs_review', 'unsolved'] as const).map(
              (stat) => {
                const label =
                  stat === 'All'
                    ? 'All'
                    : stat === 'solved'
                    ? 'Solved'
                    : stat === 'attempted'
                    ? 'Attempted'
                    : stat === 'needs_review'
                    ? 'Needs Review'
                    : 'Unsolved';

                return (
                  <button
                    key={stat}
                    type="button"
                    className={`${styles.filterPill} ${
                      statusFilter === stat ? styles.filterPillActive : ''
                    }`}
                    onClick={() => setStatusFilter(stat)}
                  >
                    {label}
                  </button>
                );
              }
            )}
          </div>

          <div className={styles.summaryCount}>
            Showing {filteredProblems.length} of {problems.length} problems
          </div>
        </div>
      </div>

      {/* Grid of Problem Cards */}
      {filteredProblems.length > 0 ? (
        <div className={styles.grid}>
          {filteredProblems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              attempt={attemptMap.get(problem.id)}
              onOpenLogModal={onOpenLogModal}
              onOpenDiscussion={onOpenDiscussion}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Inbox size={40} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No matching problems found</h3>
          <p className={styles.emptyDesc}>
            Try clearing your search or switching difficulty, company, and status filter options.
          </p>
          <button type="button" className={styles.resetFiltersBtn} onClick={resetFilters}>
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProblemList;
