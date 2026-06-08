import "@testing-library/jest-dom/vitest";
import { vi } from 'vitest';

// Mock Supabase client for unit tests
const mockAdminDeleteUser = vi.fn().mockResolvedValue({ error: null });
let userCounter = 0;
const mockAdminCreateUser = vi.fn().mockResolvedValue(() => ({
  data: { user: { id: `test-user-${++userCounter}` } },
  error: null,
}));
const mockSignUp = vi.fn().mockResolvedValue(() => ({
  data: { user: { id: `test-user-${++userCounter}` }, session: null },
  error: null,
}));
const mockSignIn = vi.fn().mockResolvedValue({
  data: { user: { id: 'test-user-id' }, session: null },
  error: null,
});
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

// Mock data storage for tests
const mockDatabase = new Map<string, any[]>();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      admin: {
        deleteUser: mockAdminDeleteUser,
        createUser: (...args: any[]) => ({
          data: { user: { id: `test-user-${++userCounter}` } },
          error: null,
        }),
      },
      signUp: (...args: any[]) => ({
        data: { user: { id: `test-user-${++userCounter}` }, session: null },
        error: null,
      }),
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
    from: vi.fn((table: string) => {
      const tableData = mockDatabase.get(table) || [];
      return {
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: any) => {
            const filtered = tableData.filter((d: any) => d[field] === value);
            return {
              single: vi.fn(() => {
                const item = filtered[0] || null;
                return Promise.resolve({ data: item, error: null });
              }),
              maybeSingle: vi.fn(() => {
                const item = filtered[0] || null;
                return Promise.resolve({ data: item, error: null });
              }),
              // Return array when not using single/maybeSingle
              then: vi.fn((resolve: any) => resolve({ data: filtered, error: null })),
              catch: vi.fn(() => ({ data: filtered, error: null })),
            };
          }),
          // Handle select without eq
          then: vi.fn((resolve: any) => resolve({ data: tableData, error: null })),
          catch: vi.fn(() => ({ data: tableData, error: null })),
        })),
        insert: vi.fn((data: any) => {
          const newItem = { 
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data 
          };
          tableData.push(newItem);
          mockDatabase.set(table, tableData);
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: newItem, error: null })),
              maybeSingle: vi.fn(() => Promise.resolve({ data: newItem, error: null })),
            })),
          };
        }),
        update: vi.fn((data: any) => ({
          eq: vi.fn((field: string, value: any) => ({
            single: vi.fn(() => {
              const index = tableData.findIndex((d: any) => d[field] === value);
              if (index !== -1) {
                tableData[index] = { ...tableData[index], ...data, updated_at: new Date().toISOString() };
                mockDatabase.set(table, tableData);
                return Promise.resolve({ data: tableData[index], error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Not found' } });
            }),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    }),
  },
}));

// Helper function to generate valid UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
