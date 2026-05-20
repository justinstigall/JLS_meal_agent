# JLS Meal Agent

Interactive single-person meal-planning app that is updated through markdown files and can be deployed free on Cloudflare Pages.

## What this app does
- Loads a weekly plan from `data/meal-plan.md`
- Loads recipe data from `data/recipes/*.md`
- Shows a day-by-day prep/cook/split/eat flow
- Builds a weekly shopping list from recipe ingredients
- Saves shopping checkbox state in browser local storage

## Update weekly plans with GitHub agents
1. Edit `data/meal-plan.md` with your new weekly requirements.
2. Add/update recipe markdown files under `data/recipes/`.
3. Keep `data/recipes/index.md` updated with recipe slugs used in the plan.
4. Commit via GitHub Copilot coding agent.

## Markdown format
`data/meal-plan.md`:
- `week_of`, `person_count`, `recipe_folder`
- `## Days` with `### <Day>` blocks
- each day includes `recipe`, plus lists for `prep`, `cook`, `split`, and `eat`

`data/recipes/<slug>.md`:
- title (`# ...`)
- `- source: <url>` (real recipe source)
- `## Ingredients` using `- <amount unit> | <ingredient name>`
- `## Steps` as numbered list

## Run locally
From repository root:

```bash
python3 -m http.server 8787
```

Then open `http://localhost:8787`.

## Deploy to Cloudflare Pages (free)
1. Push this repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select this repository.
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: `/`
5. Deploy.

Because this app is static, Cloudflare Pages free tier is enough. Interactive shopping state is stored in browser local storage (no paid backend required).
