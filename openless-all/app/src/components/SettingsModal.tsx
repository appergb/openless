// Settings keeps one navigation level; every category reuses the existing settings consumers.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { SavedToast } from './SavedToast';
import { useSavedToastListener } from '../lib/savedEvent';
import { openExternal } from '../lib/ipc';
import { getPlatformCapabilities, getCachedPlatformCapabilities } from '../lib/platform';
import { useMobileLayout, useConservativeLayout } from '../lib/useMobileLayout';
import type { OS } from './WindowChrome';
import { AboutTab, GeneralTab, ServicesTab, PrivacyTab, AdvancedTab, ShortcutsTab, AppearanceTab } from '../pages/settings/tabs';
import { searchSettingsSections, visibleSettingsSections, type SettingsSectionId } from '../pages/settings/navigation';

export type { SettingsSectionId } from '../pages/settings/navigation';

interface SettingsModalProps {
  os: OS;
  onClose: () => void;
  initialSettingsSection?: SettingsSectionId;
}

const LINKS = [
  { id: 'helpCenter', icon: 'help', href: 'https://github.com/Open-Less/openless#readme' },
  { id: 'releaseNotes', icon: 'doc', href: 'https://github.com/Open-Less/openless/releases' },
];

export function SettingsModal({ os, onClose, initialSettingsSection }: SettingsModalProps) {
  const { t } = useTranslation();
  const mobile = useMobileLayout();
  const conservative = useConservativeLayout();
  const [section, setSection] = useState<SettingsSectionId>(initialSettingsSection ?? 'general');
  const [query, setQuery] = useState('');
  const [platformCaps, setPlatformCaps] = useState(getCachedPlatformCapabilities);
  const savedToast = useSavedToastListener();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(false);
  const supportsShortcuts = platformCaps?.supportsDesktopHotkey ?? os !== 'android';
  const sections = visibleSettingsSections(supportsShortcuts).map(item => ({
    ...item,
    title: t(`modal.sections.${item.id}`),
    description: t(`modal.descriptions.${item.id}`),
    keywords: t(`modal.searchKeywords.${item.id}`),
  }));
  const searching = query.trim().length > 0;
  const results = searchSettingsSections(sections, query);

  useEffect(() => {
    let cancelled = false;
    void getPlatformCapabilities().then(caps => { if (!cancelled) setPlatformCaps(caps); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!supportsShortcuts && section === 'shortcuts') setSection('general');
  }, [supportsShortcuts, section]);

  useEffect(() => {
    mountedRef.current = true;
    if (!previousFocusRef.current && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
    // Do not summon a software keyboard when opening mobile settings.
    (mobile ? closeRef.current : searchRef.current)?.focus();
    return () => {
      mountedRef.current = false;
      window.requestAnimationFrame(() => {
        if (!mountedRef.current && previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
      });
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [section, searching]);

  const selectSection = (next: SettingsSectionId, fromSearch = false) => {
    setSection(next);
    setQuery('');
    if (fromSearch) window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Nested selectors and shortcut recorders own their keys before the dialog does.
    if (event.defaultPrevented || event.nativeEvent.isComposing) return;
    const nestedPopup = document.querySelector('[role="listbox"], [data-base-ui-portal]');
    const target = event.target instanceof Element ? event.target : null;
    if (nestedPopup || (target?.closest('[role="dialog"]') !== surfaceRef.current)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (query) { setQuery(''); searchRef.current?.focus(); }
      else onClose();
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(surfaceRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ) ?? []).filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  };

  return (
    <div
      onClick={mobile ? undefined : onClose}
      style={{ position: mobile ? 'fixed' : 'absolute', inset: 0, background: mobile ? 'var(--ol-surface)' : 'var(--ol-overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mobile ? 0 : 20, zIndex: mobile ? 70 : 50 }}
    >
      <div
        ref={surfaceRef}
        role="dialog"
        // Existing menus and child dialogs portal to document.body. Keep those
        // accessible; FloatingShell makes the covered application inert.
        aria-label={t('shell.footer.settings')}
        className="ol-settings-surface"
        data-ol-mobile={mobile ? 'true' : undefined}
        onClick={event => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', maxWidth: mobile ? undefined : 1020, height: '100%', maxHeight: mobile ? undefined : 760, minHeight: 0, background: 'var(--ol-settings-content-bg)', borderRadius: mobile ? 0 : 14, border: mobile ? 'none' : '0.5px solid var(--ol-line)', boxShadow: mobile ? 'none' : 'var(--ol-shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <header style={{ display: 'flex', alignItems: 'center', flexWrap: mobile ? 'wrap' : 'nowrap', gap: 12, padding: mobile ? 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px' : '16px 20px', borderBottom: '0.5px solid var(--ol-line-soft)', flexShrink: 0 }}>
          <div style={{ flex: mobile ? 1 : '0 0 168px', order: 0, fontSize: 16, fontWeight: 650 }}>{t('shell.footer.settings')}</div>
          {!mobile && <span style={{ order: 2, color: 'var(--ol-ink-3)', fontSize: 12 }}>{t('modal.autoSaveHint')}</span>}
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('common.close')} style={{ ...iconButtonStyle, order: mobile ? 1 : 3, marginLeft: mobile ? undefined : 'auto' }}><Icon name="close" size={17} /></button>
          <div style={{ order: mobile ? 2 : 1, flex: mobile ? '1 0 100%' : 1, maxWidth: mobile ? undefined : 420, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: '0.5px solid var(--ol-line-strong)', background: 'var(--ol-surface)', minWidth: 0 }}>
            <Icon name="search" size={15} />
            <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('modal.searchPlaceholder')} aria-label={t('modal.searchPlaceholder')} style={{ width: '100%', minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: 'var(--ol-ink)', font: 'inherit', fontSize: 13 }} />
            {query && <button type="button" aria-label={t('modal.clearSearch')} onClick={() => { setQuery(''); searchRef.current?.focus(); }} style={{ ...iconButtonStyle, width: 22, height: 22 }}><Icon name="close" size={12} /></button>}
          </div>
        </header>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: mobile ? 'column' : 'row' }}>
          <aside style={{ width: mobile ? undefined : 200, flexShrink: 0, minHeight: 0, overflow: 'auto', padding: mobile ? '8px 12px' : '16px 12px', background: 'var(--ol-settings-rail-bg)', borderRight: mobile ? undefined : '0.5px solid var(--ol-line-soft)', borderBottom: mobile ? '0.5px solid var(--ol-line-soft)' : undefined }}>
            <nav aria-label={t('modal.categoriesLabel')} className="ol-thinscroll" style={{ display: 'flex', flexDirection: mobile ? 'row' : 'column', gap: 4, overflowX: mobile ? 'auto' : undefined }}>
              {sections.map(item => (
                <button key={item.id} type="button" aria-current={!searching && section === item.id ? 'page' : undefined} onClick={() => selectSection(item.id)} className={!searching && section === item.id ? 'ol-nav-btn ol-nav-btn-active' : 'ol-nav-btn'} style={{ ...navButtonStyle, flexShrink: 0, padding: mobile ? '8px 10px' : '10px', whiteSpace: 'nowrap', background: !searching && section === item.id ? 'var(--ol-blue-soft)' : 'transparent', color: !searching && section === item.id ? 'var(--ol-blue)' : 'var(--ol-ink-2)', fontWeight: !searching && section === item.id ? 600 : 400 }}>
                  {!mobile && <Icon name={item.icon} size={15} />}{item.title}
                </button>
              ))}
            </nav>
            {!mobile && <HelpLinks />}
          </aside>
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <SavedToast saveState={savedToast.state} message={savedToast.message} slideFrom="top" offsetStyle={{ position: 'absolute', top: 12, right: 16 }} />
            <div style={{ padding: mobile ? '18px 16px 12px' : '24px 28px 16px', flexShrink: 0 }}>
              <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: mobile ? 20 : 24, fontWeight: 650, letterSpacing: '-0.025em', outline: 'none' }}>{searching ? t('modal.searchResults') : t(`modal.sections.${section}`)}</h2>
              <p style={{ margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--ol-ink-3)' }} aria-live="polite">{searching ? t('modal.searchCount', { count: results.length }) : t(`modal.descriptions.${section}`)}</p>
            </div>
            <div ref={scrollRef} className={['ol-thinscroll', conservative ? 'ol-conservative-scope' : ''].join(' ')} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: mobile ? '0 16px calc(20px + env(safe-area-inset-bottom, 0px))' : '0 28px 28px' }}>
              {searching && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map(item => <button key={item.id} type="button" onClick={() => selectSection(item.id, true)} style={{ ...navButtonStyle, border: '0.5px solid var(--ol-line)', padding: 16, alignItems: 'flex-start', background: 'var(--ol-surface)' }}>
                  <Icon name={item.icon} size={18} />
                  <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontWeight: 600, marginBottom: 5 }}>{item.title}</span><span style={{ fontSize: 12, color: 'var(--ol-ink-3)', lineHeight: 1.6 }}>{item.description}</span></span>
                  <Icon name="chevRight" size={14} />
                </button>)}
                {results.length === 0 && <div style={{ padding: '24px 16px', border: '0.5px solid var(--ol-line)', borderRadius: 10, textAlign: 'center' }}><p style={{ fontSize: 13, color: 'var(--ol-ink-3)' }}>{t('modal.noResults')}</p><button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }} style={{ ...navButtonStyle, margin: '12px auto 0', color: 'var(--ol-blue)' }}>{t('modal.clearSearch')}</button></div>}
              </div>}
              <div key={section} style={{ display: searching ? 'none' : 'flex', flexDirection: 'column', gap: 16 }}>
                {section === 'general' && <GeneralTab />}
                {section === 'shortcuts' && <ShortcutsTab />}
                {section === 'appearance' && <AppearanceTab />}
                {section === 'services' && <ServicesTab />}
                {section === 'privacy' && <PrivacyTab />}
                {section === 'advanced' && <AdvancedTab />}
                {section === 'about' && <AboutTab />}
              </div>
              {mobile && !searching && <HelpLinks />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpLinks() {
  const { t } = useTranslation();
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16, marginTop: 20, borderTop: '0.5px solid var(--ol-line-soft)' }}>{LINKS.map(link => <button key={link.id} type="button" onClick={() => void openExternal(link.href)} className="ol-nav-btn" style={navButtonStyle}><Icon name={link.icon} size={14} /><span style={{ flex: 1 }}>{t(`modal.sections.${link.id}`)}</span><Icon name="external" size={11} /></button>)}</div>;
}

const iconButtonStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, padding: 0, border: 0, borderRadius: 8, background: 'transparent', color: 'var(--ol-ink-3)', cursor: 'pointer' };
const navButtonStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 0, borderRadius: 8, background: 'transparent', color: 'var(--ol-ink-2)', font: 'inherit', fontSize: 13, cursor: 'pointer', textAlign: 'left' };
