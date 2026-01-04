# Task Completion Checklist

Before considering a task complete, ensure the following:

1. **Code Quality**:
    - [ ] Run `bun run check` to ensure linting and formatting pass.
    - [ ] Run `bun run lint:md` if documentation was modified.
2. **Testing**:
    - [ ] Run `bun test` and ensure all tests pass.
    - [ ] Add new unit/integration tests if new features were added or bugs fixed.
3. **Build**:
    - [ ] Run `bun run build` to ensure the project still compiles.
4. **Internationalization**:
    - [ ] If new strings were added, update `locales/en.json` and `locales/ja.json`.
    - [ ] Use the `t()` function for all user-facing text.
5. **Documentation**:
    - [ ] Update `README.md` and `README.ja.md` if necessary.
