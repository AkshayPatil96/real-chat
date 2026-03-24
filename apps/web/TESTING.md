# ⚡ Frontend Testing Quick Start

## Run Tests

```bash
cd apps/web

# Watch mode (recommended for development)
pnpm test

# Run once (CI/production check)
pnpm test:run

# Visual UI (debug failing tests)
pnpm test:ui

# Coverage report
pnpm test:coverage
```

## Test Results

```
✓ useTyping.test.ts (5 tests)     ← Typing indicator logic
✓ usePresence.test.ts (4 tests)   ← Online/offline tracking
✓ MessageInput.test.tsx (7 tests) ← Message sending flows

Test Files: 3 passed (3)
Tests: 16 passed (16)
Duration: ~2-3s
```

## What's Tested

### ✅ Message Sending
- Send text → input clears
- Empty input → button disabled
- Enter → sends
- Shift+Enter → new line
- Send fails → error shown

### ✅ Media Upload
- File selected → preview appears
- Upload progress tracking

### ✅ Real-time Features
- User comes online → indicator updates
- User types → "typing..." shows
- Auto-stop after 3s

## Test Files Location

```
src/
├── __tests__/
│   ├── MessageInput.test.tsx       ← User flows
│   ├── test-utils.tsx              ← Test helpers
│   └── mocks/handlers.ts           ← API mocks
└── hooks/__tests__/
    ├── usePresence.test.ts         ← Presence logic
    └── useTyping.test.ts           ← Typing logic
```

## Common Issues

### Tests fail locally?
```bash
# Clean install
pnpm install

# Re-run
pnpm test:run
```

### Need to debug?
```bash
# Use UI mode
pnpm test:ui

# Or add console.log and check terminal
pnpm test:run
```

### Update snapshots?
We don't use snapshots! If you see snapshot errors, something's wrong.

## Adding New Tests

### 1. User Flow Test
```tsx
// src/__tests__/MyComponent.test.tsx
import { renderWithProviders } from './test-utils';

it('should do something user-visible', async () => {
  const user = userEvent.setup();
  renderWithProviders(<MyComponent />);
  
  await user.click(screen.getByRole('button'));
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### 2. Hook Test
```tsx
// src/hooks/__tests__/useMyHook.test.ts
import { renderHook, act } from '@testing-library/react';

it('should update state correctly', () => {
  const { result } = renderHook(() => useMyHook());
  
  act(() => {
    result.current.doSomething();
  });
  
  expect(result.current.value).toBe(expected);
});
```

## CI Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    cd apps/web
    pnpm test:run
```

---

**Questions?** Check [apps/web/src/__tests__/README.md](./src/__tests__/README.md) for detailed docs.
