# AI Usage & Methodology Report: Refining an Agentic Development Workflow

This project started a long time ago as a game written in ruby about a mysterious castle that appears out of nowhere one day in a storm. I abandoned the ruby version when I realized I wanted to run it in the browser without a backend and, rather than translating the old ruby game, I decided to use the agents to generate the new game. That old ruby game had languished in my notebook as a half-baked plan for a long time. This is a project that probably wouldn't have come to pass without agents.

I used lovable to generate the UI, using a "brand packet" that I generated for another project to inform the design. I collaborated extensively with the web agent to take the scattered notes that I had about gameplay logic and turn them into something digestible for an agent to read. The complete game logic in human understandable format is located at `_docs/gameplay.md`. The decision tree that came out of that document that the agents use to write game logic is `.agents/docs/game_map.md`. While the agent generated placeholder text for the game when it generated `content.json`, all final game text is written by me (by hand, over the course of several years).

Taking some lessons from earlier attempts at coding with agents, I began by taking the time to curate an `.agents` directory and add some stuff I came across while reading articles. I wanted the agent to write code and docs like I would (and like I would be proud to show someone), rather than the needlessly verbose and haphazard code I had managed to produce with it on previous attempts. After some serious issues with game logic that I had tried so hard to avoid by making the above docs, I took a hard look at the setup and decided to refactor. I pulled most of the agent config out of this repo in [this PR](https://github.com/maryfranks/thelibrary/pull/42) and migrated over to a [dedicated repo](https://github.com/maryfranks/agents) for global agent configurations.

I learned a valuable lesson in a struggle with the documents that map out game logic. The game is large so the documents were large. Working with the web agent, the context got large really quickly. I had to frequently output handoff messages. I should have broken the implementation down section by section (sort out the logic, implement the code, test the code) instead of trying to map out the entire game at once. It seemed logical at the time because _I_ already knew the logic of the game and wanted only to translate it into something an agent could understand. But the game is too large to go over it all at once and it made it difficult to ensure accuracy across drafts. I should have done two things: first, commit the docs earlier. I then could have inspected the diffs to catch unintended changes. Second, I should have managed the document myself and gone over it stage by stage with the agent. I made assumptions in writing the docs about what the agents would need and could have learned from implementing the first stage, ensuring they didn't follow me through the entire implementation. It wasted a lot of time, tokens, and energy, but I do now have a much better understanding of context management.

## Token management and context separation

I generally tend to brainstorm, plan, and generate initial documentation with the web UI. It's easier than fighting with the cli agent's inherent desire to spin up files on its own initiative. It also conserves my small cli token reserve. In the same vein, I use a dedicated frontend generator for the design. It's better at it than I am and doesn't spend any of my allotment.

Having three separate types of agents do the work helps keep the components decoupled. The planning happens entirely outside of the cli, forcing the agent to rely only on the provided docs. The UI has clear boundaries and implicit instructions for how to integrate with the game logic. In this case, I further separated out the content (all of the game text), from the logic of the game engine. The text is easy to update and the long narratives stay out of the codebase.

I make distinctions in the documentation between docs for agents and docs for everyone. Process documentation that would apply to any human working in the repo also applies to agents, but because humans are expected to read it and understand it, it is optimized for humans. It contains formatting marks so that it renders nicely. Docs for agents only, on the other hand, are entirely stripped down to conserve tokens. Those docs live in the `.agents` directory.

## Pros and Cons

- The agents make it easy to make documentation updates part of each PR, but they also have a tendency to make work for themselves. Letting them update docs at their discretion results in repetition.
- Once the logic was borked, it was harder to get back to a good state than if I had just gotten it right the first time.
- I run everything in a sandboxed dev machine which makes it less stressful to give the agents some leeway but necessitates storing config in a synced repo (in this case, my private dotfiles repo).
- My agent config and my development environment were for this project alone. There was significant set up for something that won't help me in the next project.

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
