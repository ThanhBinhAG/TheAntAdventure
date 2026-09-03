'use client';

import { useState } from 'react';
import { isTaskTextCollapsible } from '@/lib/planner/planner-task-utils';
import { useLanguage } from '@/hooks/useLanguage';

interface TaskExpandableTextProps {
  text: string;
  className?: string;
  /** When set, "Show more" opens a parent modal instead of expanding inline. */
  onExpandRequest?: () => void;
}

/** Collapses long task notes to 3 lines; expand inline or via modal callback. */
export default function TaskExpandableText({
  text,
  className = '',
  onExpandRequest,
}: TaskExpandableTextProps) {
  const { tp } = useLanguage();
  const collapsible = isTaskTextCollapsible(text);
  const [expanded, setExpanded] = useState(false);
  const useModal = Boolean(onExpandRequest);
  const clamped = collapsible && (useModal || !expanded);

  function handleExpand() {
    if (!collapsible) return;
    if (onExpandRequest) {
      onExpandRequest();
      return;
    }
    setExpanded(true);
  }

  function handleCollapse() {
    setExpanded(false);
  }

  return (
    <div className="planner-task-expandable">
      <div
        className={[
          className,
          clamped ? 'planner-task-text-clamped' : '',
          collapsible ? 'planner-task-text-hit' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => {
          if (!collapsible) return;
          if (useModal || !expanded) handleExpand();
          else handleCollapse();
        }}
        onKeyDown={(e) => {
          if (!collapsible) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (useModal || !expanded) handleExpand();
            else handleCollapse();
          }
        }}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible && !useModal ? expanded : undefined}
        title={
          collapsible
            ? useModal || !expanded
              ? tp('planner', 'showMore')
              : tp('planner', 'showLess')
            : undefined
        }
      >
        {text}
      </div>
      {collapsible && (
        <button
          type="button"
          className="planner-task-text-toggle"
          onClick={(e) => {
            e.stopPropagation();
            if (useModal || !expanded) handleExpand();
            else handleCollapse();
          }}
        >
          {useModal || !expanded ? tp('planner', 'showMore') : tp('planner', 'showLess')}
        </button>
      )}
    </div>
  );
}
