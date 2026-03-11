# Contributing

## Standard for changes

- Start with an issue for non-trivial work.
- Keep pull requests focused on a single concern.
- Prefer incremental architecture over speculative abstraction.
- Add or update tests with code changes.
- Note security, privacy, and compliance impact in the pull request description when relevant.

## Pull request checklist

- Explain the problem and the chosen approach.
- Describe user-facing behavior changes.
- Add tests or explain why tests are not applicable.
- Update docs when interfaces, controls, or workflows change.
- Keep secrets, account data, and production identifiers out of commits.

## Engineering expectations

- Financial calculations must be deterministic and covered by tests.
- Time, currency, and precision behavior must be explicit.
- Risk and trading logic must be reviewable and auditable.
- New dependencies require justification.
