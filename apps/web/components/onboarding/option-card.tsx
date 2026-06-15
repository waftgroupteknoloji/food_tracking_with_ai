'use client';

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
}

/** Onboarding'de cinsiyet / aktivite gibi tek satırlık kart seçimi. */
export function OptionCard({ icon: Icon, title, subtitle, selected, onClick }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:bg-secondary',
      )}
    >
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition',
          selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon size={20} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        {subtitle && (
          <span className="block text-sm text-muted-foreground">{subtitle}</span>
        )}
      </span>
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        )}
      >
        {selected && <Check size={14} />}
      </span>
    </button>
  );
}
