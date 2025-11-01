

Fix missing vital code from the following, by comparing this repo (/home/clauderun/grok-cli-custom ) to the original codebase located at 
/home/clauderun/grok-cli/  (we forked from this version)


add a higher maxTurns default , it seems we stop way to early, set it to 500:

  ● Compare src/agent/grok-agent.ts in custom vs original to check for missing vital parts - Custom adds maxTurns parameter
     and logic to limit agentic turns (default 10), providing additional safeguard against infinite loops; no vital parts 
    missing.

add missing imports for the preprocessPrompt  and add module if missing 
      ● Compare src/hooks/use-input-handler.ts in custom vs original to check for missing vital parts - Custom has enhanced 
    dynamic command suggestions from .claude/commands/* directory, but imports from missing src/utils/slash-commands.ts file; 
    preprocessPrompt is used but the module is missing, causing import errors.


add missing preProcess to the src/index.tx if missing
      ● Compare src/index.ts in custom vs original to check for missing vital parts - Custom has enhanced headless mode with 
    multiple output formats (text/json/stream-json), preprocessPrompt import from missing slash-commands.ts, maxTurns support, 
    improved stdin/positional arg handling; imports from missing modules causing errors.


continue comparing theese files and add  missing parts
      ◐ Compare src/utils/model-config.ts in custom vs original to check for missing vital parts
      ○ Compare src/utils/settings.ts in custom vs original to check for missing vital parts
      ○ Summarize all missing vital parts found in the differing files


output a summary in reports/ directory after finishing as an .md file 
