# Contributing to [@blackrock-oss/micro-batcher]

Thank you for your interest in contributing to [@blackrock-oss/micro-batcher]! We welcome all contributions, big or small. To ensure that contributions are properly tracked and attributed, we require that all contributors sign off on their work using the Developer Certificate of Origin (DCO).

## What is the Developer Certificate of Origin?

The Developer Certificate of Origin (DCO) is a lightweight way for contributors to certify that they wrote or otherwise have the right to submit the code they are contributing to the project. It is a simple statement that must be included in every Git commit message, indicating that the contributor accepts the DCO.

## How to Sign Off on Your Work

To sign off on your work, simply add the following line to the end of your Git commit message:

```bash
Signed-off-by: [Your Name] <[your email address]>
```

This indicates that you accept and agree to the DCO. You may include this line manually, or you can add it automatically by using the -s or --signoff option when committing:

```bash
git commit -s -m "Your commit message"
```

**For VS Code users:** This repository includes workspace settings (`.vscode/settings.json`) that automatically enable sign-off for all commits. No additional configuration needed!

## Contributions without a Signed DCO

Contributions without a properly signed DCO cannot be accepted into the project. If you submit a contribution without a signed DCO, we will ask you to sign it before we can accept your contribution.

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automated semantic versioning. Your commit message format **determines the release version**.

### Format

```
<type>(<scope>): <subject>
```

**Types that trigger releases:**

| Type                | Release               | Example                                  |
| ------------------- | --------------------- | ---------------------------------------- |
| `fix:`              | Patch (1.0.0 → 1.0.1) | `fix: resolve object parameter handling` |
| `feat:`             | Minor (1.0.0 → 1.1.0) | `feat: add custom batch size support`    |
| `feat!:` or `fix!:` | Major (1.0.0 → 2.0.0) | `feat!: redesign public API`             |

**Types that don't trigger releases:** `docs:`, `test:`, `chore:`, `ci:`, `build:`, `style:`, `refactor:`, `revert:`

### Examples

```bash
# Patch release - bug fix
git commit -s -m "fix: resolve micro batcher object parameter issue"

# Minor release - new feature
git commit -s -m "feat: add retry mechanism for failed batches"

# Major release - breaking change
git commit -s -m "feat!: change default batch interval to 1000ms"

# No release - documentation
git commit -s -m "docs: update README examples"
```

**Remember:** Always use `-s` flag to sign your commits (DCO requirement).

## Additional Resources

For more information about the Developer Certificate of Origin, please see the DCO 1.1 FAQ.

Thank you for your understanding and cooperation! We look forward to your contributions.
