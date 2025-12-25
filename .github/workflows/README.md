# GitHub Actions Workflows

## Workflows

### 🚀 Release Workflow (`release.yml`)

Automatically creates semantic releases when commits are pushed to `main`.

**Triggers:**

- Push to `main` branch (automatic)
- Manual trigger via GitHub UI (workflow_dispatch)

**What it does:**

1. Builds the project
2. Analyzes commit messages using [Conventional Commits](https://www.conventionalcommits.org/)
3. Creates a new release (if applicable)
4. Publishes to npm

**Manual Release:**

1. Go to **Actions** → **Release Workflow**
2. Click **Run workflow**
3. Select branch and release type (patch/minor/major)
4. Click **Run workflow**

**Alternative (CLI):**

```bash
# Force a patch release
git commit --allow-empty -s -m "fix: force release"
git push origin main
```

---

### 🔒 DCO Check (`dco.yml`)

Verifies all commits in pull requests have proper DCO sign-off.

**Triggers:**

- Pull request opened, synchronized, or reopened

**What it does:**

1. Fetches all commits from the PR
2. Checks each commit for `Signed-off-by` line
3. Fails if any commit is missing DCO sign-off

**Fix missing sign-off:**

```bash
# Amend last commit
git commit --amend --signoff --no-edit
git push --force

# Sign multiple commits
git rebase HEAD~3 --signoff
git push --force
```

---

## Quick Reference

| Workflow  | Trigger                  | Purpose                  |
| --------- | ------------------------ | ------------------------ |
| Release   | Push to `main` or manual | Create semantic releases |
| DCO Check | Pull requests            | Enforce commit sign-off  |
