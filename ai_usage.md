# AI Usage & Methodology Report: Refining an Agentic Development Workflow

This project started a long time ago as a game written in ruby about a mysterious castle that appears out of nowhere one day in a storm. I abandoned the ruby version when I realized I wanted to run it in the browser without a backend and, rather than translating the old ruby game, I decided to start writing the new game. That game has languished in my notebook as a half-baked plan for a long time. 

I used lovable to generate the UI, using a "brand packet" that I generated for another project to inform the design. I collaborated extensively with the web agent to take the scattered notes that I had about gameplay logic and turn them into something digestable for an agent to read. The complete game logic in human understandable format is located at `_docs/gameplay.md`. The decision tree that came out of that document that the agents use to write game logic is `.agents/docs/game_map.md`. While the agent generated placeholder text for the game when it generated `context.json`, all final game text is written by me (by hand, over the course of several years). 

Taking some lessons from earlier attempts at coding with agents, I began by taking the time to curate an `.agents` directory and add some stuff I came across while reading articles. I wanted the agent to write code and docs like I would (and like I would be proud to show someone), rather than the needlessly verbose and haphazard code I had managed to produce with it on prevous attempts. 

I learned a valuable lesson in a struggle with the documents that map out game logic. The game is large so the documents were large and the context got large really quickly. I had to frequently output handoff messages. I should have broken the implementation down section by section (sort out the logic, implement the code, test the code) instead of trying to map out the entire game at once. It seemed logical at the time because I already knew the logic of the game and want only to translate it into some an agent could understand. But the game is too large to go over all at once and it made it difficult to ensure accuracy across drafts. If I'd committted the docs earlier, I could have relied on diffs but I did not do that either. It wasted a lot of time, tokens, and energy.   

## Token management and context separation

I genearally tend to brainstorm, plan, and generate initial documentation with the web UI. It's easier than fighting with the cli agent's inherent desire to spin up files on its own initiative. It also conserves my small cli token reserve. In the same vein, I use a dedicated frontend generator for the design. It's better at it than I am and doesn't spend any of my allotment. 

Having three separate types of agents do the work makes it easy to keep the components decoupled. The planning happens entirely outside of the cli, forcing the agent to rely only on the provided docs. The UI has clear boundaries and implicit instructions for how to integrate with the game logic. In this case, I further separate out the content (all of the game text), from the logic of the game engine. ALL test is kept short and sweet until development is finished so as not to waste any tokens. 

I make distinctions in the documentation between docs for agents and docs for everyone. Process documentation that would apply to any human working in the repo also applied to agents, but because humans are expected to read it and understand it, it is optimized for humans. It contains md formatting marks so that it renders nicely. Docs for agents only, on the other hand, are entirely stripped down to conserve tokens. Those docs live in the `.agents` directory. 

## Pros and Cons
The nice thing about working with agents is that every step along the way you have to make sure that your docs are still good. Is this github issue still relevant? do I need to update the details somewhere. it leaves a nice paper trail and makes it easy to create good docs. 

All of my customizations live in the `.agents` directory of this repo except the writing sample I provide for my distinct voice. 

## How did it go? What would I do differently?

- Better context size management with tools like rtk. I ran into token limits often.
- Smaller context loops. If it's too big for my brain to follow, it's way too big for the agent. 

## Appendix: Agent Customizations

### UI design prompt: 

1. Design & Styling Source of Truth
- All design choices, color values, surface tokens, border radiuses, and typography rules MUST be pulled directly and strictly from the attached `BRAND.md` (`brand_design_packet.md`). Do not use default or generic styles; use the explicit token architecture provided in the brand file.

2. Layout & Component Structure
- Header / Title Section:
  - Display the game title "The Library" using Spectral serif typography styled according to the brand packet's heading hierarchy and accent color tokens.
  - Include a brief, elegant description directly beneath it with this exact text: 
    "Caught in an unnatural storm, you take refuge in a library. When you get inside, the library is trashed and there's no one in sight. You can't leave—the door locks behind you. Navigate monsters, a maze, and a flooded basement to escape, and find out what happened in that library."
- Main Terminal Window:
  - Center a minimalist, distraction-free terminal console window using the brand packet's sunken background tokens, hairline border rules, and hardware-inspired accent styling.
  - Use IBM Plex Mono exclusively for all terminal text, output streams, and user inputs, with tabular numbers enabled.
  - Include a blinking cursor block (`▌`) at the active prompt line.
  - Implement a lightweight, mock state loop inside the single-page component to handle basic command inputs and text history output locally for visual testing—do not implement full game logic or external file dependencies.
- Footer Navigation:
  - Clean, minimal footer links positioned at the bottom following the brand typography rules: a link to the game's [ GitHub Repository ] and a navigational link back to your main portfolio.

## Skills

I took a second iteration with a loop of subagents on this project. It can be found at `.agents/skills/SKILL.md`. I will revise it and rename it when I incorporate it into my growing skills bank. I let the agent write it. 