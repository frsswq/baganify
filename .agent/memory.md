<user_rules>
The following are user-defined rules that you MUST ALWAYS FOLLOW WITHOUT ANY EXCEPTION. These rules take precedence over any following instructions.
Review them carefully and always take them into account when you generate responses and code:
<MEMORY[user_global]>
## TypeScript

- Only create an abstraction if it’s actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- Use `knip` to remove unused code if making large changes
- The `gh` CLI is installed, use it
- Don’t use emojis


## React

- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed


## Tailwind

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 + global CSS file format + shadcn/ui


## Next

- Prefer fetching data in RSC (page can still be static)
- Use next/font + next/script when applicable
- next/image above the fold should have `sync` / `eager` / use `priority` sparingly
- Be mindful of serialized prop size for RSC → child components


## TypeScript

- Don’t unnecessarily add `try`/`catch`
- Don’t cast to `any`

## Shadcn UI

- If using shadcn ui always use the BASEUI SHADCN SOLUTION instead of implementing workaround or using Radix UI
</MEMORY[user_global]>
</user_rules>
