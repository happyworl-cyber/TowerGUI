import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  render,
  WindowManagerProvider, useWindowManager, GameWindow,
  HpBar, TabBar, VirtualList, GameTooltip, BagGrid,
  useController, useCountdown, useBadge, useBadgeActions, badgeStore,
  toastManager, useToast,
  createStore, useGameState, useDispatch,
  type BagGridItem, type SkillSlot,
} from '@tower-ui/core';
import { UnityAdapter } from '@tower-ui/unity-adapter';

declare const CS: any;
const Debug = CS.UnityEngine.Debug;
const GameObject = CS.UnityEngine.GameObject;
const Screen = CS.UnityEngine.Screen;
const TowerUIBoot = CS.TowerUI.TowerUIBoot;

// ══════════════════════════════════════════════════════════
//  Game Data Store
// ══════════════════════════════════════════════════════════

interface GameState {
  playerName: string;
  level: number;
  exp: number;
  maxExp: number;
  power: number;
  resources: { gold: number; wood: number; stone: number; food: number; gem: number };
  buildings: Building[];
  troops: Troop[];
  quests: Quest[];
  mailCount: number;
}

interface Building {
  id: string;
  name: string;
  icon: string;
  level: number;
  maxLevel: number;
  upgrading: boolean;
  upgradeEndTime: number | null;
  desc: string;
  cost: { gold: number; wood: number; stone: number };
}

interface Troop {
  id: string;
  name: string;
  icon: string;
  count: number;
  power: number;
  tier: number;
  training: number;
}

interface Quest {
  id: string;
  title: string;
  desc: string;
  progress: number;
  total: number;
  reward: { gold?: number; gem?: number; exp?: number };
  completed: boolean;
}

const INITIAL_STATE: GameState = {
  playerName: 'Commander',
  level: 12,
  exp: 3400,
  maxExp: 5000,
  power: 28750,
  resources: { gold: 125000, wood: 84000, stone: 62000, food: 93000, gem: 320 },
  buildings: [
    { id: 'castle', name: 'Castle', icon: 'Ca', level: 12, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'The heart of your kingdom. Unlocks new buildings.', cost: { gold: 50000, wood: 30000, stone: 20000 } },
    { id: 'barracks', name: 'Barracks', icon: 'Ba', level: 10, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Train infantry units here.', cost: { gold: 20000, wood: 15000, stone: 8000 } },
    { id: 'stable', name: 'Stable', icon: 'St', level: 8, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Train cavalry units here.', cost: { gold: 25000, wood: 10000, stone: 12000 } },
    { id: 'archery', name: 'Archery Range', icon: 'Ar', level: 9, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Train ranged units here.', cost: { gold: 22000, wood: 18000, stone: 6000 } },
    { id: 'farm', name: 'Farm', icon: 'Fa', level: 11, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Produces food over time.', cost: { gold: 8000, wood: 5000, stone: 3000 } },
    { id: 'mine', name: 'Mine', icon: 'Mi', level: 10, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Produces stone over time.', cost: { gold: 10000, wood: 8000, stone: 2000 } },
    { id: 'lumber', name: 'Lumber Mill', icon: 'Lu', level: 10, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Produces wood over time.', cost: { gold: 9000, wood: 2000, stone: 5000 } },
    { id: 'wall', name: 'City Wall', icon: 'Wa', level: 7, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Defends your city from attacks.', cost: { gold: 30000, wood: 20000, stone: 25000 } },
    { id: 'academy', name: 'Academy', icon: 'Ac', level: 6, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Research technologies here.', cost: { gold: 35000, wood: 12000, stone: 15000 } },
    { id: 'hospital', name: 'Hospital', icon: 'Ho', level: 8, maxLevel: 30, upgrading: false, upgradeEndTime: null, desc: 'Heal wounded troops.', cost: { gold: 18000, wood: 10000, stone: 8000 } },
  ],
  troops: [
    { id: 't1', name: 'Militia', icon: 'Mi', count: 5000, power: 1, tier: 1, training: 0 },
    { id: 't2', name: 'Swordsman', icon: 'Sw', count: 3200, power: 3, tier: 2, training: 0 },
    { id: 't3', name: 'Knight', icon: 'Kn', count: 1800, power: 6, tier: 3, training: 200 },
    { id: 't4', name: 'Archer', icon: 'Ac', count: 2500, power: 2, tier: 1, training: 0 },
    { id: 't5', name: 'Crossbowman', icon: 'Cb', count: 1500, power: 4, tier: 2, training: 0 },
    { id: 't6', name: 'Cavalry', icon: 'Cv', count: 800, power: 8, tier: 3, training: 100 },
  ],
  quests: [
    { id: 'q1', title: 'Upgrade Castle to Lv.13', desc: 'Upgrade your Castle', progress: 0, total: 1, reward: { gold: 50000, gem: 100 }, completed: false },
    { id: 'q2', title: 'Train 500 troops', desc: 'Train any troops', progress: 320, total: 500, reward: { gold: 20000, exp: 500 }, completed: false },
    { id: 'q3', title: 'Gather 100k food', desc: 'Collect food from farms', progress: 93000, total: 100000, reward: { gold: 10000, gem: 50 }, completed: false },
    { id: 'q4', title: 'Win 3 battles', desc: 'Attack other players', progress: 1, total: 3, reward: { gem: 200, exp: 1000 }, completed: false },
    { id: 'q5', title: 'Collect daily reward', desc: 'Tap to collect', progress: 1, total: 1, reward: { gold: 5000, gem: 20, exp: 200 }, completed: true },
  ],
  mailCount: 3,
};

const gameStore = createStore<GameState>(INITIAL_STATE);

// set up badge counts
badgeStore.set('mail', 3);
badgeStore.set('quest', INITIAL_STATE.quests.filter(q => q.completed).length);

// ══════════════════════════════════════════════════════════
//  Utility
// ══════════════════════════════════════════════════════════

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString?.() ?? String(n);
}

const COLORS = {
  bg: '#0d1117',
  panel: '#161b22',
  panelLight: '#1c2333',
  border: '#30363d',
  accent: '#58a6ff',
  gold: '#ffd700',
  green: '#3fb950',
  red: '#f85149',
  orange: '#d29922',
  text: '#c9d1d9',
  textDim: '#8b949e',
  tier1: '#8b949e',
  tier2: '#58a6ff',
  tier3: '#d2a8ff',
};

// ══════════════════════════════════════════════════════════
//  Top Resource Bar
// ══════════════════════════════════════════════════════════

function ResourceBar() {
  const res = useGameState(gameStore, s => s.resources);
  const gem = res?.gem ?? 0;

  const items: { label: string; value: number; color: string }[] = [
    { label: 'Gold', value: res?.gold ?? 0, color: COLORS.gold },
    { label: 'Wood', value: res?.wood ?? 0, color: '#8B4513' },
    { label: 'Stone', value: res?.stone ?? 0, color: '#708090' },
    { label: 'Food', value: res?.food ?? 0, color: COLORS.green },
  ];

  return React.createElement('ui-view', {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: 1920, height: 50, tint: COLORS.panel + 'ee', padding: 8,
  },
    React.createElement('ui-view', { flexDirection: 'row', gap: 24, alignItems: 'center', width: 1200, height: 50 },
      ...items.map((item, i) =>
        React.createElement('ui-view', { key: `res-${i}`, flexDirection: 'row', alignItems: 'center', gap: 4, width: 200, height: 40 },
          React.createElement('ui-text', { text: item.label, fontSize: 12, color: item.color, width: 45, height: 20, bold: true }),
          React.createElement('ui-text', { text: formatNum(item.value), fontSize: 14, color: COLORS.text, width: 80, height: 20 }),
        )
      ),
    ),
    React.createElement('ui-view', { flexDirection: 'row', alignItems: 'center', gap: 4, width: 120, height: 40 },
      React.createElement('ui-text', { text: 'Gem', fontSize: 12, color: '#a855f7', width: 32, height: 20, bold: true }),
      React.createElement('ui-text', { text: formatNum(gem), fontSize: 14, color: COLORS.text, width: 60, height: 20 }),
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Player Info Panel (top-left)
// ══════════════════════════════════════════════════════════

function PlayerInfo() {
  const name = useGameState(gameStore, s => s.playerName);
  const level = useGameState(gameStore, s => s.level);
  const exp = useGameState(gameStore, s => s.exp);
  const maxExp = useGameState(gameStore, s => s.maxExp);
  const power = useGameState(gameStore, s => s.power);

  return React.createElement('ui-view', {
    position: 'absolute', top: 60, left: 16,
    flexDirection: 'column', gap: 4, width: 280, height: 100,
    tint: COLORS.panel + 'dd', padding: 10,
  },
    React.createElement('ui-view', { flexDirection: 'row', alignItems: 'center', gap: 8, width: 260, height: 24 },
      React.createElement('ui-text', { text: `Lv.${level}`, fontSize: 14, color: COLORS.accent, width: 50, height: 20, bold: true }),
      React.createElement('ui-text', { text: name ?? 'Commander', fontSize: 16, color: COLORS.text, width: 140, height: 20, bold: true }),
    ),
    React.createElement(HpBar, {
      current: exp ?? 0, max: maxExp ?? 1, width: 260, height: 14,
      barColor: COLORS.accent, label: `EXP ${exp}/${maxExp}`,
    }),
    React.createElement('ui-view', { flexDirection: 'row', alignItems: 'center', gap: 4, width: 260, height: 20 },
      React.createElement('ui-text', { text: 'Power:', fontSize: 12, color: COLORS.textDim, width: 50, height: 18 }),
      React.createElement('ui-text', { text: formatNum(power ?? 0), fontSize: 14, color: COLORS.gold, width: 100, height: 18, bold: true }),
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Bottom Menu Bar
// ══════════════════════════════════════════════════════════

function BottomMenu() {
  const wm = useWindowManager();
  const mailBadge = useBadge('mail');
  const questBadge = useBadge('quest');

  const buttons: { id: string; label: string; badge: number }[] = [
    { id: 'buildings', label: 'Build', badge: 0 },
    { id: 'troops', label: 'Troops', badge: 0 },
    { id: 'quests', label: 'Quest', badge: questBadge.count },
    { id: 'mail', label: 'Mail', badge: mailBadge.count },
    { id: 'shop', label: 'Shop', badge: 0 },
  ];

  return React.createElement('ui-view', {
    position: 'absolute', bottom: 0, left: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
    width: 1920, height: 70, tint: COLORS.panel + 'ee', padding: 8,
  },
    ...buttons.map(btn =>
      React.createElement('ui-view', {
        key: btn.id, width: 130, height: 54,
        tint: wm.isOpen(btn.id) ? COLORS.accent + '33' : COLORS.panelLight,
        alignItems: 'center', justifyContent: 'center',
        onClick: () => {
          if (wm.isOpen(btn.id)) { wm.close(btn.id); }
          else { wm.open({ id: btn.id, title: btn.label, width: 600, height: 500 }); }
        },
      },
        React.createElement('ui-text', {
          text: btn.badge > 0 ? `${btn.label} (${btn.badge})` : btn.label,
          fontSize: 15, color: btn.badge > 0 ? COLORS.red : COLORS.text, width: 120, height: 24,
          align: 'center', bold: true,
        }),
      )
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Buildings Window
// ══════════════════════════════════════════════════════════

function BuildingCard({ b }: { b: Building }) {
  const [upgrading, setUpgrading] = useState(b.upgrading);
  const countdown = useCountdown({
    target: b.upgradeEndTime ?? undefined,
    onComplete: () => {
      setUpgrading(false);
      toastManager.success(`${b.name} upgraded to Lv.${b.level + 1}!`);
      gameStore.set(s => ({
        ...s,
        buildings: s.buildings.map(bb =>
          bb.id === b.id ? { ...bb, level: bb.level + 1, upgrading: false, upgradeEndTime: null } : bb
        ),
      }));
    },
  });

  const handleUpgrade = useCallback(() => {
    if (upgrading) return;
    const endTime = Date.now() + 10000;
    setUpgrading(true);
    gameStore.set(s => ({
      ...s,
      buildings: s.buildings.map(bb =>
        bb.id === b.id ? { ...bb, upgrading: true, upgradeEndTime: endTime } : bb
      ),
      resources: {
        ...s.resources,
        gold: s.resources.gold - b.cost.gold,
        wood: s.resources.wood - b.cost.wood,
        stone: s.resources.stone - b.cost.stone,
      },
    }));
    toastManager.info(`Upgrading ${b.name}...`);
  }, [b, upgrading]);

  return React.createElement('ui-view', {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: 560, height: 72, tint: COLORS.panelLight, padding: 8,
  },
    React.createElement('ui-view', {
      width: 48, height: 48, tint: COLORS.accent + '33',
      alignItems: 'center', justifyContent: 'center',
    },
      React.createElement('ui-text', { text: b.icon, fontSize: 18, color: COLORS.accent, width: 40, height: 24, align: 'center', bold: true }),
    ),
    React.createElement('ui-view', { flexDirection: 'column', gap: 2, width: 300, height: 56 },
      React.createElement('ui-text', { text: `${b.name}  Lv.${b.level}`, fontSize: 14, color: COLORS.text, width: 280, height: 20, bold: true }),
      React.createElement('ui-text', { text: b.desc, fontSize: 11, color: COLORS.textDim, width: 280, height: 16 }),
      upgrading
        ? React.createElement('ui-text', { text: `Upgrading... ${countdown.formatted}`, fontSize: 12, color: COLORS.orange, width: 280, height: 16 })
        : React.createElement('ui-text', {
            text: `Cost: ${formatNum(b.cost.gold)}g ${formatNum(b.cost.wood)}w ${formatNum(b.cost.stone)}s`,
            fontSize: 11, color: COLORS.textDim, width: 280, height: 16,
          }),
    ),
    React.createElement('ui-view', {
      width: 80, height: 36, tint: upgrading ? COLORS.textDim + '44' : COLORS.green,
      alignItems: 'center', justifyContent: 'center',
      onClick: upgrading ? undefined : handleUpgrade,
    },
      React.createElement('ui-text', {
        text: upgrading ? 'Wait' : 'Upgrade',
        fontSize: 13, color: '#ffffff', width: 72, height: 20, align: 'center', bold: true,
      }),
    ),
  );
}

function BuildingsContent() {
  const buildings = useGameState(gameStore, s => s.buildings);

  return React.createElement('ui-view', {
    flexDirection: 'column', gap: 6, padding: 8, width: 580, height: 460,
  },
    ...(buildings ?? []).map(b =>
      React.createElement(BuildingCard, { key: b.id, b })
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Troops Window
// ══════════════════════════════════════════════════════════

function TroopsContent() {
  const troops = useGameState(gameStore, s => s.troops);
  const tierColor = (t: number) => t >= 3 ? COLORS.tier3 : t >= 2 ? COLORS.tier2 : COLORS.tier1;

  return React.createElement('ui-view', {
    flexDirection: 'column', gap: 6, padding: 8, width: 580, height: 460,
  },
    React.createElement('ui-view', { flexDirection: 'row', width: 560, height: 24, gap: 4 },
      React.createElement('ui-text', { text: 'Unit', fontSize: 12, color: COLORS.textDim, width: 160, height: 20, bold: true }),
      React.createElement('ui-text', { text: 'Tier', fontSize: 12, color: COLORS.textDim, width: 60, height: 20, bold: true }),
      React.createElement('ui-text', { text: 'Count', fontSize: 12, color: COLORS.textDim, width: 100, height: 20, bold: true }),
      React.createElement('ui-text', { text: 'Power', fontSize: 12, color: COLORS.textDim, width: 80, height: 20, bold: true }),
      React.createElement('ui-text', { text: 'Training', fontSize: 12, color: COLORS.textDim, width: 80, height: 20, bold: true }),
    ),
    ...(troops ?? []).map(t =>
      React.createElement('ui-view', {
        key: t.id, flexDirection: 'row', alignItems: 'center', width: 560, height: 44,
        tint: COLORS.panelLight, padding: 4, gap: 4,
      },
        React.createElement('ui-view', { flexDirection: 'row', alignItems: 'center', gap: 6, width: 160, height: 36 },
          React.createElement('ui-view', {
            width: 32, height: 32, tint: tierColor(t.tier) + '33',
            alignItems: 'center', justifyContent: 'center',
          },
            React.createElement('ui-text', { text: t.icon, fontSize: 14, color: tierColor(t.tier), width: 24, height: 20, align: 'center', bold: true }),
          ),
          React.createElement('ui-text', { text: t.name, fontSize: 13, color: COLORS.text, width: 110, height: 20 }),
        ),
        React.createElement('ui-text', { text: `T${t.tier}`, fontSize: 13, color: tierColor(t.tier), width: 60, height: 20, bold: true }),
        React.createElement('ui-text', { text: formatNum(t.count), fontSize: 13, color: COLORS.text, width: 100, height: 20 }),
        React.createElement('ui-text', { text: formatNum(t.count * t.power), fontSize: 13, color: COLORS.gold, width: 80, height: 20 }),
        React.createElement('ui-text', {
          text: t.training > 0 ? `+${t.training}` : '-',
          fontSize: 13, color: t.training > 0 ? COLORS.green : COLORS.textDim, width: 80, height: 20,
        }),
      )
    ),
    React.createElement('ui-view', {
      width: 140, height: 40, tint: COLORS.accent,
      alignItems: 'center', justifyContent: 'center',
      onClick: () => {
        gameStore.set(s => ({
          ...s,
          troops: s.troops.map(t => ({ ...t, training: t.training + 50 })),
        }));
        toastManager.success('Training 50 of each unit!');
      },
    },
      React.createElement('ui-text', { text: 'Train All +50', fontSize: 13, color: '#ffffff', width: 130, height: 20, align: 'center', bold: true }),
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Quests Window
// ══════════════════════════════════════════════════════════

function QuestsContent() {
  const quests = useGameState(gameStore, s => s.quests);
  const { set: setBadge } = useBadgeActions();

  const handleClaim = useCallback((q: Quest) => {
    gameStore.set(s => ({
      ...s,
      quests: s.quests.map(qq => qq.id === q.id ? { ...qq, completed: false, progress: 0 } : qq),
      resources: {
        ...s.resources,
        gold: s.resources.gold + (q.reward.gold ?? 0),
        gem: s.resources.gem + (q.reward.gem ?? 0),
      },
      exp: s.exp + (q.reward.exp ?? 0),
    }));
    setBadge('quest', Math.max(0, (quests ?? []).filter(qq => qq.completed && qq.id !== q.id).length));
    toastManager.success(`Claimed: +${formatNum(q.reward.gold ?? 0)} gold, +${q.reward.gem ?? 0} gem`);
  }, [quests, setBadge]);

  return React.createElement('ui-view', {
    flexDirection: 'column', gap: 8, padding: 8, width: 580, height: 460,
  },
    ...(quests ?? []).map(q =>
      React.createElement('ui-view', {
        key: q.id, flexDirection: 'row', alignItems: 'center', gap: 8,
        width: 560, height: 80, tint: COLORS.panelLight, padding: 10,
      },
        React.createElement('ui-view', { flexDirection: 'column', gap: 3, width: 380, height: 60 },
          React.createElement('ui-text', { text: q.title, fontSize: 14, color: COLORS.text, width: 370, height: 20, bold: true }),
          React.createElement('ui-text', { text: q.desc, fontSize: 11, color: COLORS.textDim, width: 370, height: 16 }),
          React.createElement(HpBar, {
            current: q.progress, max: q.total, width: 370, height: 12,
            barColor: q.completed ? COLORS.green : COLORS.accent,
            label: `${q.progress}/${q.total}`,
          }),
        ),
        React.createElement('ui-view', {
          width: 90, height: 36,
          tint: q.completed ? COLORS.green : COLORS.textDim + '44',
          alignItems: 'center', justifyContent: 'center',
          onClick: q.completed ? () => handleClaim(q) : undefined,
        },
          React.createElement('ui-text', {
            text: q.completed ? 'Claim' : 'In Progress',
            fontSize: 12, color: '#ffffff', width: 82, height: 20, align: 'center', bold: true,
          }),
        ),
      )
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Mail Window (simple)
// ══════════════════════════════════════════════════════════

function MailContent() {
  const mails = [
    { id: 'm1', from: 'System', title: 'Welcome Commander!', time: '2h ago', read: false },
    { id: 'm2', from: 'Alliance', title: 'Alliance war starts at 20:00', time: '5h ago', read: false },
    { id: 'm3', from: 'System', title: 'Daily login reward', time: '1d ago', read: false },
  ];

  return React.createElement('ui-view', {
    flexDirection: 'column', gap: 6, padding: 8, width: 580, height: 460,
  },
    ...mails.map(m =>
      React.createElement('ui-view', {
        key: m.id, flexDirection: 'row', alignItems: 'center', gap: 8,
        width: 560, height: 56, tint: COLORS.panelLight, padding: 10,
        onClick: () => {
          toastManager.info(`Reading: ${m.title}`);
          badgeStore.set('mail', Math.max(0, badgeStore.get('mail') - 1));
        },
      },
        React.createElement('ui-view', {
          width: 8, height: 8, tint: m.read ? 'transparent' : COLORS.red,
        }),
        React.createElement('ui-view', { flexDirection: 'column', gap: 2, width: 420, height: 40 },
          React.createElement('ui-text', { text: m.title, fontSize: 13, color: COLORS.text, width: 410, height: 20, bold: !m.read }),
          React.createElement('ui-text', { text: `From: ${m.from} · ${m.time}`, fontSize: 11, color: COLORS.textDim, width: 410, height: 16 }),
        ),
      )
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  Shop Window (simple)
// ══════════════════════════════════════════════════════════

function ShopContent() {
  const shopItems = [
    { id: 's1', name: 'Gold Pack', desc: '+100K Gold', price: '50 Gem', icon: 'Au', action: () => { gameStore.set(s => ({ ...s, resources: { ...s.resources, gold: s.resources.gold + 100000, gem: s.resources.gem - 50 } })); toastManager.success('+100K Gold!'); } },
    { id: 's2', name: 'Wood Pack', desc: '+80K Wood', price: '40 Gem', icon: 'Wo', action: () => { gameStore.set(s => ({ ...s, resources: { ...s.resources, wood: s.resources.wood + 80000, gem: s.resources.gem - 40 } })); toastManager.success('+80K Wood!'); } },
    { id: 's3', name: 'Stone Pack', desc: '+60K Stone', price: '30 Gem', icon: 'St', action: () => { gameStore.set(s => ({ ...s, resources: { ...s.resources, stone: s.resources.stone + 60000, gem: s.resources.gem - 30 } })); toastManager.success('+60K Stone!'); } },
    { id: 's4', name: 'Speed Up', desc: 'Complete building now', price: '100 Gem', icon: 'Sp', action: () => { toastManager.info('No building in progress'); } },
    { id: 's5', name: 'VIP 1 Day', desc: 'All production +50%', price: '200 Gem', icon: 'VP', action: () => { toastManager.success('VIP activated for 24h!'); } },
  ];

  const row1 = shopItems.slice(0, 3);
  const row2 = shopItems.slice(3);

  const renderItem = (item: typeof shopItems[0]) =>
    React.createElement('ui-view', {
      key: item.id, flexDirection: 'column', alignItems: 'center', gap: 6,
      width: 170, height: 140, tint: COLORS.panelLight, padding: 10,
    },
        React.createElement('ui-view', {
          width: 50, height: 50, tint: COLORS.gold + '22',
          alignItems: 'center', justifyContent: 'center',
        },
          React.createElement('ui-text', { text: item.icon, fontSize: 20, color: COLORS.gold, width: 40, height: 28, align: 'center', bold: true }),
        ),
        React.createElement('ui-text', { text: item.name, fontSize: 13, color: COLORS.text, width: 150, height: 18, align: 'center', bold: true }),
        React.createElement('ui-text', { text: item.desc, fontSize: 11, color: COLORS.textDim, width: 150, height: 16, align: 'center' }),
        React.createElement('ui-view', {
          width: 100, height: 28, tint: COLORS.accent,
          alignItems: 'center', justifyContent: 'center',
          onClick: item.action,
        },
          React.createElement('ui-text', { text: item.price, fontSize: 12, color: '#ffffff', width: 90, height: 18, align: 'center', bold: true }),
        ),
      );

  return React.createElement('ui-view', {
    flexDirection: 'column', gap: 10, padding: 12, width: 580, height: 460,
  },
    React.createElement('ui-view', { flexDirection: 'row', gap: 10, width: 560, height: 140 },
      ...row1.map(renderItem),
    ),
    React.createElement('ui-view', { flexDirection: 'row', gap: 10, width: 560, height: 140 },
      ...row2.map(renderItem),
    ),
  );
}

// ══════════════════════════════════════════════════════════
//  City View (center area)
// ══════════════════════════════════════════════════════════

function CityView() {
  return React.createElement('ui-view', {
    position: 'absolute', top: 170, left: 400,
    width: 1120, height: 600,
    alignItems: 'center', justifyContent: 'center',
  },
    React.createElement('ui-text', {
      text: '[ Your Kingdom ]',
      fontSize: 28, color: COLORS.textDim + '88', width: 400, height: 40, align: 'center',
    }),
    React.createElement('ui-text', {
      text: 'Tap Build / Troops / Quest to manage your empire',
      fontSize: 14, color: COLORS.textDim + '66', width: 500, height: 24, align: 'center',
    }),
  );
}

// ══════════════════════════════════════════════════════════
//  Toast Display
// ══════════════════════════════════════════════════════════

function ToastDisplay() {
  const { toasts } = useToast();

  return React.createElement('ui-view', {
    position: 'absolute', top: 120, right: 20,
    flexDirection: 'column', gap: 6, width: 350, height: 300,
  },
    ...toasts.map(t => {
      const bg = t.type === 'success' ? COLORS.green : t.type === 'error' ? COLORS.red : t.type === 'warning' ? COLORS.orange : COLORS.accent;
      return React.createElement('ui-view', {
        key: t.id, width: 340, height: 36, tint: bg + 'cc',
        alignItems: 'center', justifyContent: 'center', padding: 8,
      },
        React.createElement('ui-text', { text: t.message, fontSize: 13, color: '#ffffff', width: 320, height: 20, align: 'center' }),
      );
    }),
  );
}

// ══════════════════════════════════════════════════════════
//  Resource Ticker (simulates production)
// ══════════════════════════════════════════════════════════

function ResourceTicker() {
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      gameStore.set(s => ({
        ...s,
        resources: {
          ...s.resources,
          gold: s.resources.gold + 120,
          wood: s.resources.wood + 80,
          stone: s.resources.stone + 50,
          food: s.resources.food + 100,
        },
      }));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return null;
}

// ══════════════════════════════════════════════════════════
//  Main App
// ══════════════════════════════════════════════════════════

function GameHUD() {
  const wm = useWindowManager();

  return React.createElement('ui-view', {
    width: 1920, height: 1080, tint: COLORS.bg,
  },
    React.createElement(ResourceTicker, null),
    React.createElement(ResourceBar, null),
    React.createElement(PlayerInfo, null),
    React.createElement(CityView, null),
    React.createElement(BottomMenu, null),
    React.createElement(ToastDisplay, null),

    React.createElement(GameWindow, {
      id: 'buildings', title: 'Buildings', width: 600, height: 500,
      x: 200, y: 150, closable: true, draggable: true,
    }, React.createElement(BuildingsContent, null)),

    React.createElement(GameWindow, {
      id: 'troops', title: 'Troops', width: 600, height: 500,
      x: 300, y: 180, closable: true, draggable: true,
    }, React.createElement(TroopsContent, null)),

    React.createElement(GameWindow, {
      id: 'quests', title: 'Quests', width: 600, height: 500,
      x: 400, y: 120, closable: true, draggable: true,
    }, React.createElement(QuestsContent, null)),

    React.createElement(GameWindow, {
      id: 'mail', title: 'Mail', width: 600, height: 500,
      x: 500, y: 160, closable: true, draggable: true,
    }, React.createElement(MailContent, null)),

    React.createElement(GameWindow, {
      id: 'shop', title: 'Shop', width: 600, height: 500,
      x: 350, y: 130, closable: true, draggable: true,
    }, React.createElement(ShopContent, null)),
  );
}

function SLGApp() {
  return React.createElement(WindowManagerProvider, null,
    React.createElement(GameHUD, null),
  );
}

export function startSLGGame() {
  Debug.Log('[SLG] Starting SLG Game Demo...');

  const canvasObj = GameObject.Find('Canvas');
  if (!canvasObj) {
    Debug.LogError('[SLG] Canvas not found!');
    return;
  }

  const w = Screen.width;
  const h = Screen.height;
  const adapter = new UnityAdapter(canvasObj.transform);
  const root = render(React.createElement(SLGApp, null), adapter, { width: w, height: h });

  TowerUIBoot.onUpdate = (dt: number) => {
    root.tick(dt);
  };

  Debug.Log('[SLG] SLG Game Demo rendered!');
}
