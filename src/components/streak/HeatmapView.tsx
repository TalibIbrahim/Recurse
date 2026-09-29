'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Calendar, Activity, Info } from 'lucide-react';
import styles from './HeatmapView.module.css';
import GlassCard from '../ui/GlassCard';
import { HeatmapData, HeatmapCell } from '../../data/types';
import { localDateKey } from '../../lib/problems';

export interface HeatmapViewProps {
  heatmapData: HeatmapData;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({ heatmapData }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayKey = localDateKey();

  // Start scrolled to the most recent weeks on narrow screens.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [heatmapData.weeks.length]);

  // Label each column where a new month begins (skipping a partial first month).
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMarkers: { label: string; weekIndex: number }[] = [];
  heatmapData.weeks.forEach((week, idx) => {
    const month = new Date(`${week.days[0].date}T00:00:00`).getMonth();
    const prev = idx > 0 ? new Date(`${heatmapData.weeks[idx - 1].days[0].date}T00:00:00`).getMonth() : -1;
    if (month !== prev && (idx > 0 || new Date(`${week.days[0].date}T00:00:00`).getDate() <= 7)) {
      monthMarkers.push({ label: MONTHS[month], weekIndex: idx });
    }
  });

  // Helper for cell level style
  const getLevelClass = (level: number) => {
    switch (level) {
      case 1:
        return styles.lvl1;
      case 2:
        return styles.lvl2;
      case 3:
        return styles.lvl3;
      case 4:
        return styles.lvl4;
      default:
        return styles.lvl0;
    }
  };

  return (
    <GlassCard variant="default" className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.heading}>
            <Calendar size={18} className="text-accent-green" />
            <span>Consistency Activity Grid</span>
          </div>
          <span className={styles.subheading}>
            {heatmapData.total_solves_in_year} solves across 52 weeks
          </span>
        </div>

        <div className={styles.metricsGroup}>
          <div className={styles.metricBadge}>
            <span className={styles.metricNum}>{heatmapData.active_days}</span>
            <span className={styles.metricLabel}>Active Days</span>
          </div>
          <div className={styles.metricBadge}>
            <span className={styles.metricNum}>{heatmapData.longest_streak}d</span>
            <span className={styles.metricLabel}>Longest Streak</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Calendar Table */}
      <div className={styles.scrollArea} ref={scrollRef}>
        <div className={styles.heatmapTable}>
          {/* Months Header Row */}
          <div className={styles.monthsRow}>
            {monthMarkers.map((m) => (
              <span
                key={`${m.label}-${m.weekIndex}`}
                className={styles.monthLabel}
                style={{ left: `calc(2rem + ${m.weekIndex * 14}px)` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className={styles.gridBody}>
            {/* Day of Week Labels */}
            <div className={styles.daysColumn}>
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
              <span />
            </div>

            {/* Weeks Columns */}
            <div className={styles.weeksContainer}>
              {heatmapData.weeks.map((week) => (
                <div key={week.week_index} className={styles.weekCol}>
                  {week.days.map((day) => (
                    <div
                      key={day.date}
                      className={`${styles.cell} ${getLevelClass(day.level)} ${
                        day.date > todayKey ? styles.cellFuture : ''
                      }`}
                      onMouseEnter={() => setHoveredCell(day)}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${day.date}: ${day.count} solves`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredCell && (
          <div className={styles.tooltipBox}>
            <strong>{hoveredCell.date}</strong> —{' '}
            {hoveredCell.count === 0
              ? 'No solves recorded'
              : `${hoveredCell.count} ${hoveredCell.count === 1 ? 'problem' : 'problems'} solved`}
            {hoveredCell.problems.length > 0 && (
              <div style={{ marginTop: '0.25rem', color: 'var(--label-secondary)' }}>
                {hoveredCell.problems.map((p) => p.title).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Heatmap Legend */}
      <div className={styles.legendRow}>
        <span>Less</span>
        <div className={`${styles.legendBox} ${styles.lvl0}`} />
        <div className={`${styles.legendBox} ${styles.lvl1}`} />
        <div className={`${styles.legendBox} ${styles.lvl2}`} />
        <div className={`${styles.legendBox} ${styles.lvl3}`} />
        <div className={`${styles.legendBox} ${styles.lvl4}`} />
        <span>More Solves</span>
      </div>
    </GlassCard>
  );
};

export default HeatmapView;
