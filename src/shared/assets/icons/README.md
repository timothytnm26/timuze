# Icons

Every icon in the app is a plain `.svg` file here – open it, edit it, replace it. Use them with
`<Icon name="play" className="size-4" />` (`shared/ui/Icon`); `name` is the path without `.svg`.

- **Colour** – icons use `currentColor`, so they take the text colour around them. The service marks
  in `brands/` keep their own colours.
- **Line icons** – drawn with `stroke="currentColor"`; weight, caps and joins come from the skin
  (`--icon-stroke`, `--icon-cap`, `--icon-join` in `app/styles/skins/*.css`), so one file looks right in
  all four skins.
- **A skin's own drawing** – put a file at `skins/<skin>/<name>.svg` (same `name`) and that skin uses it
  instead of the default. Pixel does this for the logo and the small controls (`shape-rendering="crispEdges"`,
  squares on the grid); retro and glass redraw the logo.
- **Adding an icon** – drop `my-icon.svg` here and add `'my-icon'` to `ICON_NAMES` in `index.ts`
  (a missing file is warned about in dev). Keep the `viewBox`, leave out `width`/`height`.
- **Branding** – `logo.svg` is the mark in the header and (per skin) the tab icon; `public/favicon.svg` is
  its static copy for the first paint.
