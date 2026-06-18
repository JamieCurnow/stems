# Project Planning

When panning out the project, we use the /roadmap directory to outline the project.
This is a directory of markdown files outlining features and tasks for devs.

There can be nested directories for features, and each feature can have a list of tasks.
The index.md in the feature directory is the feature description, and then the other .md files are the tasks.

Each task will have some metadata at the top, defined in a yaml frontmatter.
Even the index.md files should have this metadata.

- title: the title of the task
- description: a short overview description of the task
- priority: low | medium | high
- complexity: low | medium | high
- status: not-started | in-progress | done
- clickupTicketId: the id of the ticket in clickup
- timeEstimate: the estimated time to complete the task in hours. When passing to the ClickUp MCP tool, convert to milliseconds (multiply by 3,600,000) e.g. `7200000` for 2 hours. The ClickUp API uses milliseconds.

Then the body of the file will be the description of the task in detail with implementation notes, etc.

The purpose of these files are to aid developers in building out features and tasks.

## Clickup

ClickUp ticket structure should mirror the roadmap directory hierarchy:

- **Parent task** = top-level feature (e.g. "Create CRUD Endpoints") → from `roadmap/feature/index.md`
- **Subtask** = sub-feature or collection group (e.g. "Admins CRUD Endpoints") → from `roadmap/feature/sub-feature/index.md`
- **Sub-subtask** = individual task (e.g. "List Admins") → from `roadmap/feature/sub-feature/task.md`

Tickets should be created with the "dev backlog" status. Use the title from the roadmap file, and the short description from the roadmap file. Also mention the filepath in the repository. Write the ticket id back to the roadmap file in the clickupTicketId field once created.
