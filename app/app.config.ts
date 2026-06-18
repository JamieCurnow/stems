// Nuxt UI semantic colour aliases mapped to the Stems brand scales defined in
// app/assets/css/main.css (@theme). Swap a scale here to rebrand in one place.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'peach',
      secondary: 'sage',
      success: 'leaf',
      info: 'sage',
      warning: 'terracotta',
      error: 'rose',
      neutral: 'clay'
    },
    // Toast × Instagram: buttons are pills app-wide (see DESIGN.md). Set here
    // once rather than adding `rounded-full` to every button. Inputs/cards keep
    // the default radius — this only targets the button base slot.
    button: {
      slots: {
        base: 'rounded-full'
      }
    }
  }
})
