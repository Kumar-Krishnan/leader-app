/**
 * Supabase Mocks - Centralized Supabase client mocking
 *
 * Usage:
 * import { createMockSupabase, createChainableMock } from '@/__mocks__/supabase';
 */

export {
  createChainableMock,
  createMockSupabase,
  mockSupabase,
  configureMockTable,
  configureMockTableError,
  resetSupabaseMock,
} from './client';
