# Code Style and Conventions

## Tooling

- **Biome** is used for linting and formatting.
- **TypeScript** with strict mode (checked via `tsconfig.json`).

## Formatting Rules

- **Indentation**: 2 spaces.
- **Quotes**: Double quotes for JavaScript/TypeScript strings.
- **Line Endings**: LF.

## Naming Conventions

- **Files**: kebab-case or snake_case (e.g., `index.ts`, `repro_detection.ts`).
- **Functions/Variables**: camelCase.
- **Constants**: SCREAMING_SNAKE_CASE.
- **Schemas**: PascalCase with `Schema` suffix (e.g., `GoogleSearchParametersSchema`).

## Best Practices

- Use **Zod** for parameter validation.
- Use the **i18n** system (`t` function) for all user-facing strings (descriptions, error messages).
- Prefer **Bun** for running scripts and tests.
