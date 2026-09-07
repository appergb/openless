import { LLM_LABELS } from './ProvidersSection';
import { ASR_LABELS } from './shared';
import { presetsFor } from './ChannelList';

const atlascloudPreset = LLM_LABELS.find(p => p.id === 'atlascloud');

if (!atlascloudPreset) {
  throw new Error('Atlas Cloud LLM preset is missing');
}

const opencodeLabel = LLM_LABELS.find(p => p.id === 'opencode');

if (opencodeLabel?.nameKey !== 'opencode') {
  throw new Error('OpenCode LLM label is missing');
}

const openAiCompatiblePreset = ASR_LABELS.find(p => p.id === 'openai-compatible');

if (!openAiCompatiblePreset) {
  throw new Error('Custom OpenAI-compatible ASR preset is missing');
}

const zenmuxPreset = ASR_LABELS.find(p => p.id === 'zenmux');

if (!zenmuxPreset) {
  throw new Error('ZenMux ASR preset is missing');
}

const coreAsr = presetsFor('asr', 'win', true, undefined, [{
  kind: 'asr',
  providerType: 'openai-compatible',
  labelKey: 'asrOpenAiCompatible',
  defaultEndpoint: null,
  defaultModel: null,
  authRequirement: 'endpoint_model_optional_api_key',
  validationProbe: 'asr_silence',
  staticModels: [],
}]);

if (coreAsr.length !== 1 || coreAsr[0].authRequirement !== 'endpoint_model_optional_api_key') {
  throw new Error('Core provider descriptor must replace the browser fallback in the channel picker');
}

const coreLlm = presetsFor('llm', 'win', true, undefined, [{
  kind: 'llm',
  providerType: 'opencode',
  labelKey: 'opencode',
  defaultEndpoint: 'https://opencode.ai/zen/v1',
  defaultModel: 'deepseek-v4-flash',
  authRequirement: 'api_key_unless_custom_endpoint',
  validationProbe: 'llm_text',
  staticModels: [],
}]);

if (coreLlm.length !== 1 || coreLlm[0].id !== 'opencode'
  || coreLlm[0].defaultEndpoint !== 'https://opencode.ai/zen/v1'
  || coreLlm[0].defaultModel !== 'deepseek-v4-flash') {
  throw new Error('OpenCode preset must use the defaults supplied by Core');
}
