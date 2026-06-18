// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-plugin-prettier/recommended'

export default withNuxt(
  // integration-guides/snippets/ are reference copies of the files above (the
  // guides point at them). Their canonical twins in app/ and server/ are
  // linted; linting the copies too just trips Nuxt page/error naming rules
  // that only apply inside a real app directory.
  { ignores: ['integration-guides/**'] }
)
  // Run Prettier (.prettierrc) as an ESLint rule and disable any built-in
  // rules that would conflict with it. This makes `npm run lint -- --fix`
  // produce the exact same output as format-on-save. Appended last so it wins
  // over the Nuxt/stylistic configs above.
  .append(prettier)
