import React from 'react';

export interface SkillSlot {
  id: string;
  icon: string;
  cooldown?: number;
  maxCooldown?: number;
  hotkey?: string;
  disabled?: boolean;
}

export interface SkillBarProps {
  skills: SkillSlot[];
  slotSize?: number;
  gap?: number;
  onUseSkill?: (id: string) => void;
}

export function SkillBar(props: SkillBarProps) {
  const { skills, slotSize = 64, gap = 6, onUseSkill } = props;
  if (skills.length === 0) {
    return React.createElement('ui-view', { width: 0, height: slotSize });
  }
  const barW = skills.length * slotSize + (skills.length - 1) * gap;

  const slots = skills.map((skill) => {
    const onCooldown = (skill.cooldown ?? 0) > 0;
    const cdPct = onCooldown && skill.maxCooldown && skill.maxCooldown > 0
      ? Math.min(1, skill.cooldown! / skill.maxCooldown)
      : 0;

    return React.createElement('ui-view', {
      key: skill.id,
      width: slotSize, height: slotSize,
      tint: skill.disabled ? '#1a1a2e55' : '#1a1a2e',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      onClick: !onCooldown && !skill.disabled ? () => onUseSkill?.(skill.id) : undefined,
    },
      React.createElement('ui-text', {
        text: skill.icon, fontSize: Math.round(slotSize * 0.4),
        color: onCooldown ? '#666666' : '#ffffff',
        width: slotSize, height: Math.round(slotSize * 0.6), align: 'center',
      }),
      // Cooldown overlay
      onCooldown ? React.createElement('ui-view', {
        position: 'absolute', bottom: 0, left: 0,
        width: slotSize, height: Math.round(slotSize * cdPct),
        tint: '#00000088',
      }) : null,
      // Cooldown text
      onCooldown ? React.createElement('ui-text', {
        text: `${Math.ceil(skill.cooldown!)}s`,
        fontSize: 14, color: '#ff4444',
        width: slotSize, height: slotSize,
        align: 'center', position: 'absolute', top: 0, left: 0,
      }) : null,
      // Hotkey
      skill.hotkey ? React.createElement('ui-text', {
        text: skill.hotkey, fontSize: 10, color: '#778da9',
        width: 20, height: 14,
        position: 'absolute', right: 2, bottom: 2,
      }) : null,
      // Border
      React.createElement('ui-view', {
        width: slotSize, height: 2,
        tint: onCooldown ? '#ff444488' : '#4cc9f044',
        position: 'absolute', bottom: 0, left: 0,
      })
    );
  });

  return React.createElement('ui-view', {
    flexDirection: 'row', gap,
    width: barW, height: slotSize,
    tint: '#0d1b2a88',
    padding: [0, 4, 0, 4],
    alignItems: 'center',
  }, ...slots);
}
