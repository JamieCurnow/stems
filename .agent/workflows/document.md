---
description: Document changes to the repo
---

Document the changes to this repo using the git diff against main.

`git diff main...HEAD`

Don't worry about any other branches. Just compare the current branch to main. Unless the user specifically tells you to compare against another branch.

Analyse the files one-by-one, understand what they do and then document them in their relevant catalog files. Add any learnings or patterns you notice to the `## Learnings` section of the same catalog file.

Here are the catalog files (inventory + learnings all go here):

| Domain           | File                             |
| ---------------- | -------------------------------- |
| Components       | `app/components/COMPONENTS.md`   |
| Composables      | `app/composables/COMPOSABLES.md` |
| Pages            | `app/pages/PAGES.md`             |
| Stores           | `app/stores/STORES.md`           |
| Server endpoints | `server/SERVER_ENDPOINTS.md`     |
| Server utils     | `server/utils/SERVER_UTILS.md`   |
| Types            | `shared/types/TYPES.md`          |

The `AGENTS.md` files in each directory are read-only conventions — do not edit them.
