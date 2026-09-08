import { protocolValidationError, type ProtocolValues } from './LlmProtocolFields';
import { listProviderDescriptors } from '../../lib/ipc/providers';
import { createChannel, deleteChannel, listChannels, recordChannelTest, setChannelProviderType } from '../../lib/ipc/channels';
import { readCredential, setCredential } from '../../lib/ipc/asr-credentials';
import { presetsFor } from './ChannelList';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const values: ProtocolValues = { 'ark.request_format': '', 'ark.messages_thinking': '', 'ark.max_tokens': '', 'ark.thinking_budget': '' };
assert(protocolValidationError(values, 'messages') === null, 'Core-compatible defaults must be valid');
assert(protocolValidationError({ ...values, 'ark.request_format': 'invalid' }, 'messages') === 'llmRequestFormatInvalid', 'Unknown formats must not silently fall back');
assert(protocolValidationError({ ...values, 'ark.max_tokens': '0' }, 'messages') === 'llmTokenLimitInvalid', 'Zero output tokens must be rejected');
assert(protocolValidationError({ ...values, 'ark.messages_thinking': 'budget', 'ark.max_tokens': '1024' }, 'messages') === 'llmThinkingBudgetInvalid', 'Fixed thinking must leave room for output');
assert(protocolValidationError({ ...values, 'ark.messages_thinking': 'budget', 'ark.max_tokens': '4096', 'ark.thinking_budget': '2048' }, 'messages') === null, 'Valid fixed budget must be accepted');

const descriptors = await listProviderDescriptors('llm');
const presets = presetsFor('llm', 'win', true, undefined, descriptors);
assert(presets.length === 3, 'Browser catalog should expose three compatibility presets');
assert(presets.find(p => p.id === 'custom_messages')?.defaultRequestFormat === 'messages', 'Picker must retain Core protocol defaults');
for (const preset of presets) assert(preset.supportedRequestFormats?.length === 3, 'All compatibility presets allow switching');

const first = await createChannel('llm', 'custom', 'first');
const second = await createChannel('llm', 'custom', 'second');
await setCredential('ark.request_format', 'messages', first);
await setCredential('ark.api_key', 'fixture-key', first);
await recordChannelTest('llm', first, true, 1, null);
await setCredential('ark.model_id', 'new-model', first);
assert(await readCredential('ark.request_format', first) === 'messages', 'Changing model must preserve format');
assert(await readCredential('ark.request_format', second) === null, 'Formats must be scoped by channel');
assert((await listChannels('llm')).find(c => c.id === first)?.lastTest === null, 'Credential mutation invalidates old validation');
await setChannelProviderType('llm', first, 'custom_responses');
assert(await readCredential('ark.request_format', first) === null, 'Changing preset resets the format override');
assert(await readCredential('ark.api_key', first) === 'fixture-key', 'Changing preset preserves the key');
await deleteChannel('llm', first);
await deleteChannel('llm', second);
