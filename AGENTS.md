# Repository Guidelines

## Project Structure & Module Organization

There is no application source tree, test suite, or asset directory yet. The ignored `graft/` directory is a regenerable local code index (`graft build`), not project source. As the project takes shape, keep application code, tests, and static assets in clearly named directories; document the chosen layout in a `README.md`. Keep tests close to the behavior they verify, either beside source files or in a dedicated `tests/` directory.

## Build, Test, and Development Commands

No package manager, build system, or local run command is configured yet. Add the commands needed to install dependencies, run the application, check formatting, and run tests to the project manifest or a `Makefile`. Document each command in `README.md` before asking contributors to use it. Run the relevant checks locally before submitting a change.

## Coding Style & Naming Conventions

Follow the conventions of the language and framework selected for the project. Once a formatter or linter is added, commit its configuration and use it consistently; avoid formatting unrelated files in a feature change. Use descriptive names for modules and tests, and keep naming consistent within each directory.

## Testing Guidelines

There is no test framework or coverage threshold yet. Add focused tests with the first executable behavior, and record the test command in `README.md`. Name tests for the behavior they cover so a failure identifies the affected feature. Include a regression test when fixing a reproducible bug.

## Commit & Pull Request Guidelines

This directory has no Git history, so there is no established commit-message convention. Use short, imperative commit subjects that describe the change. In pull requests, explain the purpose, summarize the checks run, and link the relevant issue when one exists. Include screenshots for visible interface changes.
