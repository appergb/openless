export type SettingsSectionId = 'general' | 'shortcuts' | 'appearance' | 'services' | 'privacy' | 'advanced' | 'about';

export interface SettingsNavigationItem {
  id: SettingsSectionId;
  icon: string;
}

export const SETTINGS_SECTIONS: SettingsNavigationItem[] = [
  { id: 'general', icon: 'mic' },
  { id: 'shortcuts', icon: 'bolt' },
  { id: 'services', icon: 'cloud' },
  { id: 'appearance', icon: 'settings' },
  { id: 'privacy', icon: 'shield' },
  { id: 'advanced', icon: 'sparkle' },
  { id: 'about', icon: 'info' },
];

export function visibleSettingsSections(supportsDesktopHotkey: boolean): SettingsNavigationItem[] {
  return SETTINGS_SECTIONS.filter(item => item.id !== 'shortcuts' || supportsDesktopHotkey);
}

export interface SearchableSettingsSection extends SettingsNavigationItem {
  title: string;
  description: string;
  keywords: string;
}

export function searchSettingsSections<T extends SearchableSettingsSection>(sections: T[], query: string): T[] {
  const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return sections.filter(item => {
    const text = normalize(`${item.title} ${item.description} ${item.keywords}`);
    return terms.every(term => text.includes(term));
  });
}

export type ServiceViewId = 'llm' | 'asr' | 'omni' | 'models' | 'connections';

export function availableServiceViews(multimodal: boolean, localModels: boolean): ServiceViewId[] {
  return [
    ...(multimodal ? ['omni' as const] : ['llm' as const, 'asr' as const]),
    ...(localModels ? ['models' as const] : []),
    'connections',
  ];
}

export function resolveServiceView(requested: ServiceViewId, available: ServiceViewId[]): ServiceViewId {
  return available.includes(requested) ? requested : available[0];
}
