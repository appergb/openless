// 本地 ASR 模型管理入口。下载与运行状态由 LocalAsr 展示，
// 是否使用该引擎由 AI 服务与模型中的语音识别渠道决定。

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
