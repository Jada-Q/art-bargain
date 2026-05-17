import { setupServer } from 'msw/node';
import { defaultAnthropicHandlers } from './anthropic';

export const server = setupServer(...defaultAnthropicHandlers);
