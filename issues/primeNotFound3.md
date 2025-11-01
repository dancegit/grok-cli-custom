The issue has been resolved. The `/prime` slash command was not visible in the Grok CLI commands menu because the menu suggestions were hardcoded in `src/hooks/use-input-handler.ts`. I've implemented the following fixes:\n\n1. **Added `/prime` to the hardcoded suggestions** as a quick fix with description \"Prime context for codebase analysis\".\n\n2. **Implemented dynamic loading of slash commands** from the `.claude/commands/` directory, following the specifications in `specs/slash_commands_spec.md`. This ensures all available slash commands (like `/prime` and `/feature`) are automatically included in the menu.\n\nThe slash command processing was already functional - it preprocesses prompts starting with `/` by substituting the content from the corresponding `.md` file. Now users will see `/prime` in the commands menu, matching the behavior described in the Claude Code documentation. When selected or typed, it will execute the priming template from `.claude/commands/prime.md` to analyze the codebase structure."}
clauderun@vps-debian12:~/grok-cli-custom$ 


fix so that we get dynamic loading of the ./claude/commands/**/xyz.md files mapped to /xyz 
like so:
./claude/commands/prime.md becomes "/prime"
and
.claude/commands/standard/plan.md becomes "/standard:plan"

