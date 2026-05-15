Please use [Conventional Commits](https://www.conventionalcommits.org/) format for your PR title, as it drives semantic versioning and release notes.

**Format:** `<type>: <description>`

| Type       | Purpose                     | Release    |
| ---------- | --------------------------- | ---------- |
| `feat`     | New feature                 | Minor      |
| `fix`      | Bug fix                     | Patch      |
| `docs`     | Documentation only          | No release |
| `test`     | Adding or updating tests    | No release |
| `chore`    | Maintenance, CI, tooling    | No release |
| `style`    | Formatting, no logic change | No release |
| `refactor` | Code restructuring          | No release |
| `perf`     | Performance improvement     | Patch      |

For breaking changes, add `!` after the type (e.g., `feat!: ...`) or include `BREAKING CHANGE:` in the PR body.

## Description

[Describe the issue or feature that this pull request is addressing. Provide context and any relevant links to issues or documentation.]

## Changes Made

[Describe the changes made in this pull request, including any new code or dependencies added, removed, or updated.]

## Definition of Done

Before submitting this pull request, please ensure that the following criteria have been met:

- [ ] All automated tests have passed successfully.
- [ ] All manual tests have passed successfully.
- [ ] Code has been reviewed by at least one other team member.
- [ ] Code has been properly documented and commented as needed.
- [ ] All new and existing code adheres to our project's coding standards.
- [ ] All dependencies have been added or removed from the project's README or other documentation as needed.
- [ ] Any relevant documentation or help files have been updated to reflect the changes made in this pull request.
- [ ] Any necessary database migrations have been run.
- [ ] Any relevant UI changes have been reviewed and approved by the UI/UX team.

## Additional Notes

[Add any additional notes or context for the reviewer or future maintainers of this code.]

Thank you for submitting!
