// 设置弹窗里每个侧栏 tab 对应的内容页。每个 tab 就是若干 section 卡片的纵向堆叠；
// 真正的逻辑都在各 *Section 文件里，这里只负责"哪些 section 归到哪个 tab"。

import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { RecordingInputSection } from './RecordingInputSection';
import { RemoteInputSection } from './RemoteInputSection';
import { ShortcutsSection } from './ShortcutsSection';
import { SelectionWorkspaceSection } from './SelectionWorkspaceSection';
import { LanguageSection } from './LanguageSection';
import { ThemeSection } from './ThemeSection';
import { LayoutSection } from './LayoutSection';
import { ProvidersSection } from './ChannelList';
import { NetworkSection } from './NetworkSection';
import { MarketplaceSection } from './MarketplaceSection';
import { PermissionsSection } from './PermissionsSection';
import { DataStorageSection } from './DataStorageSection';
import { LocalModelSection } from './LocalModelSection';
import { DebugToolsSection } from './DebugToolsSection';
import { MultimodalPipelineSection } from './MultimodalPipelineSection';
import { CodingAgentSection } from './CodingAgentSection';
import { ClaudeConsoleSection } from './ClaudeConsoleSection';
import { BetaChannelSection } from './BetaChannelSection';
import { AutoUpdateSection } from './AutoUpdateSection';
import { AboutSection } from './AboutSection';
import { detectOS } from '../../components/WindowChrome';
import { getPlatformCapabilities } from '../../lib/platform';
import { listChannels } from '../../lib/ipc';
import type { PlatformCapabilities } from '../../lib/types';
import { useHotkeySettings } from '../../state/HotkeySettingsContext';
import { availableServiceViews, resolveServiceView, type ServiceViewId } from './navigation';

// 各 tab 共用的平台能力查询（决定桌面/移动、是否支持热键与自动更新等 gating）。
function usePlatformCaps(): PlatformCapabilities | null {
  const [platformCaps, setPlatformCaps] = useState<PlatformCapabilities | null>(null);

  useEffect(() => {
    void getPlatformCapabilities().then(setPlatformCaps);
  }, []);

  return platformCaps;
}

// 录音与输入：从录音到落字，以及手机输入。
export function GeneralTab() {
  const platformCaps = usePlatformCaps();
  const showRemoteInput = platformCaps?.platform === 'desktop';

  return (
    <>
      <RecordingInputSection />
      {showRemoteInput && <RemoteInputSection />}
    </>
  );
}

export function ShortcutsTab() {
  const platformCaps = usePlatformCaps();
  if (!platformCaps?.supportsDesktopHotkey) return null;
  return <><ShortcutsSection /><SelectionWorkspaceSection /></>;
}

export function AppearanceTab() {
  return <><ThemeSection /><LayoutSection /><LanguageSection /></>;
}

// 服务：AI 提供商 · 本地模型 · 扩展市场。
// 本地模型是「语音识别由谁提供」的一种答案，和云端提供商属同一决策，
// 不再藏进「高级」。
export function ServicesTab() {
  const { t } = useTranslation();
  const { prefs } = useHotkeySettings();
  const platformCaps = usePlatformCaps();
  const showLocalModel = platformCaps?.supportsLocalAsr === true;
  const multimodal = prefs?.multimodalPipelineEnabled === true && prefs.pipelineMode === 'multimodal';
  const [view, setView] = useState<ServiceViewId>('llm');
  const views = availableServiceViews(multimodal, showLocalModel);
  const selectedView = resolveServiceView(view, views);
  const contentRef = useRef<HTMLDivElement>(null);

  // 语言模型 / 语音识别是必配项：tab 上挂状态点 —— 未配置红、已配置黄
  // （2.0 UI 走查）。任何渠道增删改/启停后 ChannelList 会广播
  // ol-channels-changed，这里即时重算。
  const [requiredConfigured, setRequiredConfigured] = useState<{ llm: boolean; asr: boolean }>({ llm: false, asr: false });
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void Promise.all([listChannels('llm'), listChannels('asr')])
        .then(([llm, asr]) => {
          if (cancelled) return;
          setRequiredConfigured({
            llm: llm.some(channel => channel.enabled),
            asr: asr.some(channel => channel.enabled),
          });
        })
        .catch(() => { /* 读取失败保持上一次状态，不打扰用户 */ });
    };
    load();
    window.addEventListener('ol-channels-changed', load);
    return () => { cancelled = true; window.removeEventListener('ol-channels-changed', load); };
  }, []);

  return (
    <>
      <div role="group" aria-label={t('modal.serviceViews.label')} className="ol-service-views ol-thinscroll">
        {views.map(id => {
          const required = id === 'llm' || id === 'asr';
          const configured = id === 'llm' ? requiredConfigured.llm : id === 'asr' ? requiredConfigured.asr : false;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selectedView === id}
              onClick={() => setView(id)}
              title={required ? t(configured ? 'modal.serviceViews.statusConfigured' : 'modal.serviceViews.statusMissing') : undefined}
            >
              {required && <span aria-hidden className="ol-service-status-dot" data-state={configured ? 'ok' : 'missing'} />}
              {t(`modal.serviceViews.${id}`)}
            </button>
          );
        })}
      </div>
      <div key={selectedView} ref={contentRef} className="ol-service-content">
        {selectedView === 'llm' && <ProvidersSection kind="llm" />}
        {selectedView === 'asr' && <ProvidersSection kind="asr" />}
        {selectedView === 'omni' && <ProvidersSection />}
        {selectedView === 'models' && <LocalModelSection />}
        {selectedView === 'connections' && <><NetworkSection /><MarketplaceSection /></>}
        {(selectedView === 'llm' || selectedView === 'asr') && <p className="ol-service-storage-note">{t('settings.providers.credentialStorageNotice')}</p>}
      </div>
    </>
  );
}

// 隐私：本地优先说明 + 权限管理 · 数据存储。
export function PrivacyTab() {
  const { t } = useTranslation();
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--ol-blue-soft)',
          marginBottom: 2,
        }}
      >
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 999,
          background: 'var(--ol-surface)',
          color: 'var(--ol-blue)', fontWeight: 600, flexShrink: 0,
        }}>
          {t('modal.about.localFirst')}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--ol-ink-3)', lineHeight: 1.55 }}>
          {t('modal.about.privacyDesc')}
        </span>
      </div>
      <PermissionsSection />
      <DataStorageSection />
    </>
  );
}

// 高级：只留真正的实验性/开发者功能 —— Less Computer · Claude 控制台 · 调试工具。
// （本地模型移入「服务」、更新相关移入「关于」，这个 tab 不再是杂物抽屉。）
// 调试工具本身是跨端的：Android 复用同一份 prefs / 录音导出入口；
// 这里只做平台 gating，不把桌面特有能力耦合进移动端运行时。
export function AdvancedTab() {
  const os = detectOS();
  const platformCaps = usePlatformCaps();
  const showDesktopAdvanced = platformCaps?.platform === 'desktop';
  const showDebugTools =
    platformCaps?.platform === 'desktop' || platformCaps?.platform === 'android';

  return (
    <>
      {/* Less Computer 在 Windows/macOS 交付；Claude 控制台保留原有平台范围。 */}
      {showDesktopAdvanced && (os === 'mac' || os === 'win') && <CodingAgentSection />}
      {showDesktopAdvanced && os === 'mac' && <ClaudeConsoleSection />}
      <MultimodalPipelineSection />
      {showDebugTools && <DebugToolsSection />}
    </>
  );
}

// 关于：版本信息 · 更新渠道 · 自动更新 —— 「我用的是什么版本、怎么更新」归一处。
export function AboutTab() {
  const platformCaps = usePlatformCaps();
  const showUpdateControls = platformCaps?.supportsAutoUpdate === true;

  return (
    <>
      <AboutSection />
      {showUpdateControls && <BetaChannelSection />}
      {showUpdateControls && <AutoUpdateSection />}
    </>
  );
}
