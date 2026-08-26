'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { SUGGESTED_SKILLS } from '@/lib/data/technician-specialisations';
import { cn } from '@/lib/cn';

interface SkillTagInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  error?: string;
  disabled?: boolean;
}

/** Freeform chip/tag input for Technician.skills (a plain String[] — no closed set in the schema) with a few common suggestions to click-add. */
export function SkillTagInput({ value, onChange, error, disabled }: SkillTagInputProps) {
  const [draft, setDraft] = useState('');

  function addSkill(raw: string) {
    const skill = raw.trim();
    if (!skill || value.includes(skill)) return;
    onChange([...value, skill]);
    setDraft('');
  }

  function removeSkill(skill: string) {
    onChange(value.filter((s) => s !== skill));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      removeSkill(value[value.length - 1]!);
    }
  }

  const unusedSuggestions = SUGGESTED_SKILLS.filter((s) => !value.includes(s));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-secondary">Skills *</span>
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded border border-line bg-surface px-2 py-1.5',
          error && 'border-danger-500 dark:border-danger-400',
        )}
      >
        {value.map((skill) => (
          <span key={skill} className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-400">
            {skill}
            {!disabled ? (
              <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`} className="hover:text-accent-900 dark:hover:text-accent-200">
                <X className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </span>
        ))}
        {!disabled ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addSkill(draft)}
            placeholder={value.length === 0 ? 'Type a skill and press Enter…' : ''}
            className="min-w-[8rem] flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p> : null}
      {!disabled && unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addSkill(s)}
              className="rounded-full border border-line px-2 py-0.5 text-micro text-ink-secondary hover:bg-surface-hover"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
