# Notch test suite

Vitest drives unit and hook tests for renderer `src/lib`, selected hooks, and pure Electron helpers.

```bash
npm test              # run once (CI)
npm run test:watch    # watch mode
npm run test:coverage # coverage report in coverage/
```

## Layout

| Path | Scope |
|------|--------|
| `tests/unit/` | Pure TS helpers under `src/lib` |
| `tests/hooks/` | React hooks (`jsdom`) |
| `tests/electron/` | Main-process modules without UI |
| `tests/fixtures/` | Shared settings / weather / GitHub data |

Add tests next to the behavior they lock in — prefer fixtures over copying large domain types inline.