This is the components directory.
It includes all of the vue components in this Nuxt4 project.

When making a new component it should live here.
Components should be named in PascalCase and be placed in the appropriate directory.

The directory name will end up prefixing the component name.
For example, if you have a component named `AgentList.vue` in the `Chat` directory, it will be registered as `ChatAgentList` and used as `<ChatAgentList />`.

There is a COMPONENTS.md file in this directory that documents all of the components in this directory.

- If you add a new component, it must be documented in COMPONENTS.md.
- If you remove a component, it must be removed from COMPONENTS.md.
- If you update a component, it must be updated in COMPONENTS.md.
- If you learn something worth preserving, add it to the `## Learnings` section in COMPONENTS.md.
