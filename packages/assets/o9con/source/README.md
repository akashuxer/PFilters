# UX team drop zone

This folder is the **inbox** for icon-font deliveries from the UX team. Files
dropped here are git-ignored (except this README) and are consumed by the
`o9con:update` script.

## How to use

1. Get the latest icon-font folder from the UX team. It will typically look
   like `Font File <date>/` and contain at least:

   - `fonts/o9con.eot`
   - `fonts/o9con.svg`
   - `fonts/o9con.ttf`
   - `fonts/o9con.woff`
   - `fonts/o9con.woff2`
   - one of: `scss/icons.scss`, `unicodesMap.json`, or `css/icons.css`

2. Drop the entire folder into this `source/` directory. Either of these is
   fine:

   ```
   packages/assets/o9con/source/Font File 24 Jun 26/fonts/...
   packages/assets/o9con/source/fonts/...    # loose files also work
   ```

3. Run the pipeline:

   ```bash
   pnpm --filter @arvo/assets run o9con:update
   ```

4. Review the diff summary the script prints, then commit the generated
   changes (see `../UPDATE-WORKFLOW.md` for the full workflow).

If multiple drops are present, the pipeline picks the most recently modified
one. Old drops can be safely deleted from this folder once their update has
been committed.
