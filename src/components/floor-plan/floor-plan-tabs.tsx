"use client"

import type { FloorPlan } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface FloorPlanTabsProps {
  floorPlans: FloorPlan[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function FloorPlanTabs({ floorPlans, activeId, onSelect }: FloorPlanTabsProps) {
  if (floorPlans.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {floorPlans.map((fp) => (
        <button
          key={fp.id}
          type="button"
          onClick={() => onSelect(fp.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors",
            fp.id === activeId
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-input hover:bg-muted"
          )}
        >
          {fp.name}
        </button>
      ))}
    </div>
  );
}
