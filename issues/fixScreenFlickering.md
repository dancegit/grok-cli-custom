bug1:

try to solve screen flickering in the grok-cli (continue on this: 
  ⏺ Updated Todo
    ⎿ ● Remove console.clear() from chat-interface.tsx to prevent screen clearing that may cause flickering
      ○ Throttle state updates during streaming to reduce frequent re-renders and flickering
      ○ Move logo rendering from console.log to inside Ink component for better integration
      ○ Test the changes to ensure flickering is resolved in interactive mode
)

bug2:

then try to figure out why grok-cli stops/exits after say a few iterations both in headless mode and interactive mode, but it does not in the original code located at /home/clauderun/grok-cli/
