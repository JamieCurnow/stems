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
    },
    // Drag-to-close from anywhere. Vaul (the drawer engine) lets you drag the
    // sheet down — but its default `container` slot is `overflow-y-auto`, an
    // inner scroll area that swallows vertical touch drags. The only reliably
    // draggable zone left is the handle (it sits outside that scroller), which
    // is the "reach for the top to pull it down" jank. Our drawers are short
    // bottom-sheets that don't need an inner scroll, so we drop the scroller
    // (`overflow-y-visible`): the whole sheet becomes one draggable surface and
    // taps on buttons still fire (vaul only drags past a movement threshold).
    // If a future drawer genuinely needs to scroll, override `ui.container`
    // back to `overflow-y-auto` on that instance.
    drawer: {
      slots: {
        container: 'overflow-y-visible'
      }
    }
  }
})
