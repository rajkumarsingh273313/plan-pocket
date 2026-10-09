<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the existing standalone PlanPocket app served through the root iframe; presentation changes must preserve element IDs and DOM ordering because legacy handlers use positional selectors.
- Build the CFO PDF from current scenario values and displayed metrics, with document colors sourced from semantic CSS tokens, so exports match the app without duplicating finance calculations.
