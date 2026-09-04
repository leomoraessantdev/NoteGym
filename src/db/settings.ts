import { getDatabase } from './client';

export type Settings = {
  profileName: string;
  goal: string;
  unit: string;
  daysPerWeek: number;
  calendarMode: 'fixed' | 'seq';
  restSeconds: number;
  notifications: string;
};

const DEFAULTS: Settings = {
  profileName: 'Você',
  goal: 'Hipertrofia',
  unit: 'kg',
  daysPerWeek: 5,
  calendarMode: 'fixed',
  restSeconds: 90,
  notifications: 'Ativas',
};

const KEYS: Record<keyof Settings, string> = {
  profileName: 'profile_name',
  goal: 'goal',
  unit: 'unit',
  daysPerWeek: 'days_per_week',
  calendarMode: 'calendar_mode',
  restSeconds: 'rest_seconds',
  notifications: 'notifications',
};

export async function loadSettings(): Promise<Settings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    profileName: map.get(KEYS.profileName) ?? DEFAULTS.profileName,
    goal: map.get(KEYS.goal) ?? DEFAULTS.goal,
    unit: map.get(KEYS.unit) ?? DEFAULTS.unit,
    daysPerWeek: Number(map.get(KEYS.daysPerWeek) ?? DEFAULTS.daysPerWeek),
    calendarMode: (map.get(KEYS.calendarMode) as Settings['calendarMode']) ?? DEFAULTS.calendarMode,
    restSeconds: Number(map.get(KEYS.restSeconds) ?? DEFAULTS.restSeconds),
    notifications: map.get(KEYS.notifications) ?? DEFAULTS.notifications,
  };
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [KEYS[key], String(value)]
  );
}
