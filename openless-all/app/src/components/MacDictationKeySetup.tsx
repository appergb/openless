import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { formatComboParts } from '../lib/hotkey';
import { setDictationHotkey } from '../lib/ipc';
import type { ShortcutBinding } from '../lib/types';

const PRIMARY = 'MacDictationKey';
type Phase = 'idle' | 'testing' | 'cancelling' | 'confirm' | 'saving';

/** Explicit, no-audio setup; the existing shortcut survives every failed/cancelled test. */
export function MacDictationKeySetup({ binding, previousBinding, onChanged }: {
  binding: ShortcutBinding;
  previousBinding?: ShortcutBinding | null;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(30);
  const [active, setActive] = useState<boolean | null>(null);
  const expected = useRef(binding);
  const mounted = useRef(true);
  const cancelled = useRef(false);
  const selected = binding.primary === PRIMARY;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      void invoke('cancel_macos_dictation_key_test');
    };
  }, []);
  useEffect(() => {
    if (!selected) { setActive(null); return; }
    let cancelled = false;
    const read = () => void invoke<boolean>('macos_dictation_key_active')
      .then(value => { if (!cancelled) setActive(value); })
      .catch(() => { if (!cancelled) setActive(false); });
    read();
    const timer = window.setInterval(read, 2000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selected]);
  useEffect(() => {
    if (phase !== 'testing') return;
    const timer = window.setInterval(() => setRemaining(n => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  const failure = (value: unknown) => {
    const text = String(value);
    if (text.includes('macDictationKeyCancelled')) return;
    const key = ['Permission', 'Timeout', 'Busy', 'Changed'].find(key => text.includes(`macDictationKey${key}`));
    setError(key ?? 'Unavailable');
  };
  const test = async () => {
    cancelled.current = false;
    expected.current = structuredClone(binding);
    setError(null); setRemaining(30); setPhase('testing');
    try {
      await invoke('test_macos_dictation_key');
      if (mounted.current) setPhase(cancelled.current ? 'idle' : 'confirm');
    } catch (value) {
      if (mounted.current) { failure(value); setPhase('idle'); }
    }
  };
  const activate = async () => {
    setError(null); setPhase('saving');
    try {
      await invoke('activate_macos_dictation_key', { expectedBinding: expected.current });
      if (mounted.current) await onChanged();
    } catch (value) {
      if (mounted.current) failure(value);
    } finally {
      if (mounted.current) setPhase('idle');
    }
  };
  const cancel = async () => {
    cancelled.current = true;
    setPhase('cancelling');
    try { await invoke('cancel_macos_dictation_key_test'); }
    catch { if (mounted.current) setPhase('idle'); }
  };
  const button = { padding: '5px 10px', border: '1px solid var(--ol-border)', borderRadius: 6,
    background: 'var(--ol-bg)', color: 'var(--ol-ink)', cursor: 'pointer', fontSize: 12 };
  return <div style={{ fontSize: 12, display: 'grid', gap: 8 }}>
    {phase === 'idle' && <>
      {selected ? <>
        <div>{t(`macDictationKey.${active === null ? 'checking' : active ? 'active' : 'inactive'}`)}</div>
        <div style={{ color: 'var(--ol-ink-4)' }}>{t('macDictationKey.replace')}</div>
        {previousBinding && <button style={button} onClick={async () => {
          setError(null); setPhase('saving');
          try { await setDictationHotkey(previousBinding); await onChanged(); }
          catch (value) { if (mounted.current) failure(value); }
          finally { if (mounted.current) setPhase('idle'); }
        }}>{t('macDictationKey.restore', { shortcut: formatComboParts(previousBinding).join(' + ') })}</button>}
        {active === false && <button style={button} onClick={() => {
          expected.current = structuredClone(binding); void activate();
        }}>{t('macDictationKey.retry')}</button>}
      </> : <button style={button} onClick={() => void test()}>{t('macDictationKey.use')}</button>}
      <div style={{ color: 'var(--ol-ink-4)' }}>{t('macDictationKey.description')}</div>
    </>}
    {(phase === 'testing' || phase === 'cancelling') && <>
      <div role="status">{t('macDictationKey.testing', { seconds: remaining })}</div>
      <button style={button} disabled={phase === 'cancelling'} onClick={() => void cancel()}>{t('common.cancel')}</button>
    </>}
    {phase === 'confirm' && <>
      <div>{t('macDictationKey.confirm')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={button} onClick={() => void activate()}>{t('macDictationKey.accept')}</button>
        <button style={button} onClick={() => setPhase('idle')}>{t('macDictationKey.keep')}</button>
      </div>
    </>}
    {phase === 'saving' && <div role="status">{t('common.loading')}</div>}
    {error && <div role="alert">{t(`macDictationKey.${error}`)}</div>}
    {error === 'Permission' &&
      <button style={button} onClick={() => void invoke('open_system_settings', { pane: 'accessibility' })}>
        {t('macDictationKey.permissionSettings')}
      </button>}
  </div>;
}
