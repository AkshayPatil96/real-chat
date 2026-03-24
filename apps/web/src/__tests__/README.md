# Frontend Test Suite

Portfolio-grade test suite for Real-Chat web application.

## Stack

- **Vitest** - Test runner
- **@testing-library/react** - Component testing utilities
- **@testing-library/jest-dom** - DOM matchers
- **MSW** - API mocking

## Test Structure

```
src/
  __tests__/
    setup.ts                    # Global test configuration
    test-utils.tsx              # Test helpers & Redux wrappers
    MessageInput.test.tsx       # Critical user flow tests
    mocks/
      handlers.ts               # MSW API mock handlers
      server.ts                 # MSW server setup
  hooks/__tests__/
    usePresence.test.ts         # Presence tracking logic
    useTyping.test.ts           # Typing indicator logic
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

## What's Tested

### 1️⃣ Critical User Flows (Integration)
- ✅ Send text message and clear input
- ✅ Disable send button when empty
- ✅ Show media preview on file select
- ✅ Handle message send errors
- ✅ Enter key to send
- ✅ Shift+Enter for newlines
- ✅ API integration (request/response)

### 2️⃣ Hook Logic (Unit)
- ✅ `usePresence`: Online/offline tracking
- ✅ `useTyping`: Typing indicators & auto-stop timeout

### 3️⃣ Edge Cases
- ✅ Error toast on send failure
- ✅ Null socket handling
- ✅ Current user not showing as typing

## Test Philosophy

- **High-value only**: Tests protect against regressions in critical flows
- **User-centric**: Test behavior users see, not implementation details
- **No snapshots**: Avoid brittle tests that break on style changes
- **Minimal mocking**: Mock only network & socket layer
- **Fast**: Full suite completes in ~2s

## Coverage

Tests cover:
- Message sending flow
- Media upload preview
- Real-time presence
- Typing indicators
- Error handling

Not tested (intentionally):
- Styling/animations
- Third-party libraries (Clerk, Radix UI)
- Visual appearance
- E2E flows (use Playwright for that)

## Maintenance

- Add tests when fixing bugs (regression protection)
- Keep test count small (5-15 tests ideal)
- Prefer integration over unit tests
- Update MSW handlers when API changes
