// 服务 → 本地模型：本地 ASR 模型的管理入口。含 Qwen3（macOS）/ Foundry Local +
// sherpa-onnx（Windows）三条本地引擎。
//
// 2026-08 重构：本地 ASR 不再有「启用开关」——本地 ASR 始终可用，是否激活由
// 「服务 → AI 提供商」的 ASR 语音转写供应商决定：选到本地模型供应商即使用本地
// 引擎（与 Apple 语音同理）。这里只保留模型下载 / 管理看板（<LocalAsr embedded />）。

import { useEffect, useState } from 'react';
import type { PlatformCapabilities } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { LocalAsr } from '../LocalAsr';
import { getPlatformCapabilities } from '../../lib/platform';
import '../LocalAsr/local-asr.css';

export function LocalModelSection() {
  const { t } = useTranslation();
  const [platformCaps, setPlatformCaps] = useState<PlatformCapabilities | null>(null);

  useEffect(() => {
    void getPlatformCapabilities().then(setPlatformCaps);
  }, []);

  const platformSupported = platformCaps?.supportsLocalAsr === true;

  return (
    <section className="ol-local-model-section">
      <header className="ol-local-model-heading">
        <div>
          <h2>{t('modal.serviceViews.models')}</h2>
          <p>{t('localAsr.performanceWarning')}</p>
        </div>
        <span className="ol-model-status">{t('localAsr.qwenExperimentalBadge')}</span>
      </header>
      {platformCaps === null ? (
        <p className="ol-model-muted" role="status">{t('common.loading')}</p>
      ) : !platformSupported ? (
        <p className="ol-model-muted">{t('settings.advanced.platformNotSupported')}</p>
      ) : <LocalAsr embedded />}
    </section>
  );
}
