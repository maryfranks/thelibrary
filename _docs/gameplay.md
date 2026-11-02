# Library Escape: Game Narrative Overview 

## Global Mechanics & Parser Rules
* **Explicit Command Prompts:** The game must explicitly tell the player what options or commands they can type at any decision point.
* **Invalid Input Handling:** If the player types something outside of the offered options, a small collection of quippy responses denotes that it isn't an option, followed by a reminder of what the valid options are. 

## Stage 1: Vestibule (Tutorial Area)

### Narrative Atmosphere
You enter the vestibule escaping an unnatural storm. The heavy front doors slam shut behind you with a definitive, mechanical click. Looking into the library, it immediately becomes clear that something horrific has happened here. 

### Core Room Rules & Opening Choice
* **Mandatory Initial Encounter:** Upon entering, you are presented with two immediate choices:
  * **Choice 1:** `try to leave`
    * **Outcome:** You pound on the door and yell, alerting the periodical monster hiding near the circulation desk. `[DEAD: monster_attack]`
    * **Tutorial Respawn:** Automatically respawns you right back into the vestibule with a warning: *"Since you're trapped, you might as well look around."*
  * **Choice 2:** `look around`
    * **Outcome:** You assess your surroundings. The game reveals what you see, including a mop lying next to a full mop bucket and the modern anti-theft turnstiles blocking further progress.

### Interactive Walkthrough & Inventory
* **Checking Your Pack:** 
  * **Valid Command:** `look in the pack`
  * **Result:** Displays your starting inventory formatted as:
    * `a snack`
    * `a worn paperback novel`
    * `a retractable point pen`

### Turnstile & Mop Choices
When facing the turnstiles after exploring the room, you are presented with two choices:
* **Choice 1 (The Stubborn Path):** `hop turnstiles` (without picking up the mop)
  * **Outcome:** The game gives you a warning: *"Are you sure? What if you need to defend yourself?"* (Proceeding without it means you enter the next stage unequipped, leading to a brutal death in Stage 2).
* **Choice 2 (The Happy Path):** `pick up mop`
  * **Outcome:** Places the mop in your pack, allowing you to proceed safely to the next stage.

### Transition to Stage 2
* **Valid Command:** `hop turnstiles`
* **Result:** You cross into the Foyer (carrying the mop, or dangerously empty-handed).

---

## Stage 2: Foyer Area

- **Arrival & Mandatory Check:** Player enters the Foyer. The very first action must be `look around` (which lists the initial searchable things in the room: `search corpse` and `search desk`).
- **Initial Death Condition:** If the player moves or acts before looking around:
  - the periodical monster that followed/waited for you heard your movement and ate you. `[DEAD: monster_attack]`
- **Initial Searchable Objects & Inventory:**
  - `search corpse`: Interacting with the fallen librarian's remains yields the explicit inventory items:
    - `lemon candy`
    - `pack of gum`
    - `mace`
    - `hair ties`
  - `search desk`: Interacting with the circulation desk yields the explicit inventory items:
    - `small notebook`
    - `stacks key` (explicitly noting it doesn't open the front vestibule door)
- **Exploring Periodicals:**
  - After searching the corpse and the desk, the player must `explore the periodicals`.
- **`[ITEM CHECK: mop]`**
  - **No Mop:** Moving deeper into the area without the mop results in the monster attacking you because you are unarmed. `[DEAD: monster_attack]`
  - **With Mop:** You successfully deter the monster with the mop as you move deeper.
- **The Reading Room Door & Choices:**
  - While exploring the Foyer, the player finds the specific door leading into the Reading Room.
  - **Choices at Reading Room Door:**
    - `rattle reading room door` (Panic & Rattle): your frantic rattling on the reading room door echoes through the stacks, immediately provoking the periodical monster out of hiding to strike before you can react. `[DEAD: monster_attack]`
    - `try the lock quietly` (Quietly Try the Lock): You find the door locked. The game prompts you: *"Where should we go next?"*, encouraging you to `look around`.
- **Post-Reading Room Options & The Poker:**
  - Once you `look around` a second time, you discover the fireplace. With the fireplace revealed, your new available explicit command choices are:
    - `search fireplace`: Getting the `fireplace poker` replaces the mop in the pack (you drop the mop). 
    - `go deeper`: If you skip searching the fireplace and continue on, you proceed while still carrying the mop.
- **The Stacks Door & Final Foyer Gate:**
  - **`[ITEM CHECK: stacks key]`**
  - **No Key:** The door is locked. You don't have the key. You turn around to look toward the circulation desk, and the monster is there. 
  - **Choice / Outcome:** 
    - `defend yourself`: you swing frantically, but the monster bats it aside like a twig and drags you into the racks. `[DEAD: monster_attack]`
    - `slowly walk backwards`: you slowly step backward, but it pounces on you before you can make it. `[DEAD: monster_attack]`
  - **With Key:** You successfully open the door using the key to pass into the next area.

---

## Stage 3: The Stacks

- **Arrival & Ambush:** Upon entering the stacks, a horrendous flying creature attacks immediately before you can get your bearings.
- **Weapon Check (`[ITEM CHECK: fireplace_poker / mop]`):**
  - **With Mop:** you tripped over the unwieldy mop while trying to swing at it, resulting in a fatal fall. `[DEAD: environmental_hazard]`
  - **With Poker:** Player swings the poker, strikes the creature, and it flies away scared. (Survived).
- **Initial Stack Environment Options:** After surviving the flying creature, the game states that you are in the stacks and there are rows of books ahead of you. The options are presented in order:
  - `look around`: Yields the 5-row layout and opens up navigation.
  - `go deeper`: you rushed blindly into the stacks without looking around, and something waiting in the shadows struck instantly. `[DEAD: monster_attack]`
  - `go back`: You try to retreat to the foyer, but you find the monster from the foyer waiting for you, forcing you to slip back into the stacks. (Survived / continues play).

### The Five Parallel Rows / Paths
- **Environment:** Dimly lit, flickering lights, sounds of movement. Five parallel rows/paths ahead. Players can choose to visit these rows in any order they choose.
- **Core Exploration Mechanics:** 
  - `peer down row`: The player can safely peer down any row to get a description.
  - `go down row`: The player commits to moving down a specific row, triggering encounters, searches, or hazards.
  - `go back`: The player can always choose to `go back` to the main stack junction as long as they are alive.

### Path Details & Specific Rules

- **Path 1 (The Reading Room Path):**
  - `peer down row`: You see a heavy door leading into the reading room.
  - `go down row`: You reach the reading room door and are presented with choices:
    - `look around`: You spot small evidence of the monster lingering nearby to warn you, then you can choose to `go back`.
    - `enter reading room`: something giant and frightening inside the reading room killed you. `[DEAD: monster_attack]`
    - `go back`: Safely return to the main stack junction.

- **Path 2 (The Body Path & The Flashlight Check):**
  - `peer down row`: You see a dim corridor with a fallen figure in the distance.
  - `go down row`: You advance to `search corpse` to collect:
    - `pocketknife`
    - `umbrella`
  - **Post-Search Options:** After searching the corpse, you have explicit choices:
    - `look around`: It's quiet, but shadows stretch unnaturally long ahead.
    - `go deeper`: Attempt to move further down the corridor.
  - **`[ITEM CHECK: flashlight]`:**
    - **No Flashlight:** The game prompts you to go back: *"It looks dark. I wonder if there's a lightswitch somewhere back there."* You are presented with choices:
      - `go deeper`: refusing to heed the warning, you tried to navigate the dark corridor without your flashlight, and something in the shadows got you in the pitch black. `[DEAD: monster_attack]`
      - `go back`: Safely return to the main junction to pick a new corridor.
    - **With Flashlight:** Safely serves as the ultimate safe exit route out of the near stacks.
    - `go back`: Safely return to the main stack junction.

- **Path 3 (The Misleading Standard Path - Hazard):**
  - `peer down row`: You see a standard, clean-looking row of bookshelves. It looks completely normal and safe.
  - `go down row`: Going straight down Path 3 results in instant danger and death:
    - something lurking just out of sight in the middle path killed you. `[DEAD: monster_attack]`

- **Path 4 (The Narrow Backpack Path):**
  - `peer down row`: You see a narrow, cramped aisle choked with tight shelving.
  - `go down row`: You move down the row and discover a discarded pack resting against a bookshelf, allowing you to `search backpack` to collect:
    - `water`
    - `flashlight`
    - `second snack`
    - `notebook`
    - `dictionary`
    - `pencil`
  - **Post-Search Options:** After searching the pack, you have explicit choices:
    - `look around`: It's tight and claustrophobic, discouraging you from going any further.
    - `go deeper`: the thing lurking in row 3 ambushed you when you reached the end of row 4. `[DEAD: monster_attack]`
    - `go back`: Safely return to the main stack junction.

- **Path 5 (The Mysterious Warning Path):**
  - `peer down row`: The first time you select peer down row 5, it warns you that your hair stands up on end and there's something unnatural about the darkness. You are given two choices:
    - `peer`: You choose to peer a second time. Everything goes completely black before you can react, and you don't know what killed you. `[DEAD: unknown_death]`
    - `go back`: Safely return to the main stack junction.
  - *(Note: You can never `go down row` 5).*

---

## Stage 4: The Deep Stacks

- **Initial Maze Entry:** You find yourself deeper in the stacks. The path ahead is blocked by some fallen books, but there's another route around the shelf on the other side. You are presented with explicit options:
  - `go deeper`: you plunged into the maze without looking around, and a collapsed shelf shifted instantly, crushing you. `[DEAD: environmental_hazard]`
  - `look around`: You see Junction A with two paths in front of you, opening up navigation into the maze.
- **Environment & Layout:** Collapsed shelving forming a convoluted maze. All junction choices are binary. Navigation memory informs the player which way they went previously. There is only one correct path out.

### The Maze

- **Junction A:** When you reach Junction A, you are presented with explicit options:
  - `go left`: you took the left path and triggered a structural collapse of shelving. `[DEAD: environmental_hazard]`
  - `go right`: proceeds deeper into the maze.

- **Junction B:** When you reach Junction B, you are presented with explicit options:
  - `go straight`: you stepped onto a rotted floor section that gave way over a deep drop-off. `[DEAD: environmental_hazard]`
  - `go sideways`: proceeds deeper into the maze.

- **Junction C (The Torn Tapestry):** When you reach Junction C, you are presented with explicit options:
  - `go around`: you tried an alternate route, triggering a sudden structural cave-in. `[DEAD: environmental_hazard]`
  - `go forward`: 
    - **`[ITEM CHECK: pocketknife]`**
    - **Without Pocketknife:** you tried to force your way past the heavy academic tapestries without a tool, you fall and hit your head and die. `[DEAD: environmental_hazard]`
    - **With Pocketknife:** you use `pocketknife` (or `cut tapestries`) to clear the heavy academic barrier safely and proceed deeper into the maze.

- **Junction D (Loopback 1):** When you reach Junction D, you are presented with explicit options:
  - `go left`: you take the left path, looping all the way back to the very beginning of the maze.
  - `go right`: proceeds deeper into the maze.

- **Junction E (The Electrical Hazard):** When you reach Junction E, you are presented with explicit options:
  - `step down`: you stepped into a flooded puddle in contact with a live electrical conduit. `[DEAD: environmental_hazard]`
  - `step across`: proceeds deeper into the maze.

- **Junction F (The Monster's Nest - Alcove Death 1):** When you reach Junction F, you are presented with explicit options:
  - `explore alcove`: you wandered into a dead-end alcove where the creature dropped straight down from the crossbeams. `[DEAD: monster_attack]`
  - `bypass alcove`: proceeds deeper into the maze.

- **Junction G:** When you reach Junction G, you are presented with explicit options:
  - `climb aisle`: you triggered an aisle where the monster rested atop an unstable bookshelf and knocked it over onto you. `[DEAD: environmental_hazard]`
  - `duck under`: proceeds deeper into the maze.

- **Junction H (Loopback 2):** When you reach Junction H, you are presented with explicit options:
  - `take left corridor`: you take the left corridor, looping backward to just after the last loopback, landing you right back at Junction E.
  - `take right corridor`: proceeds to the end of the maze.

### End of Maze & The Final Branch
- **Arrival at Structural Hub:** Exits into a central structural hub with a final binary choice leading to the next phases of the escape:
  - `go upstairs`: head toward the upper mezzanine level.
  - `go into basement`: head downward into the lower levels.

---

## Final Stage: The Upper Mezzanine 

- **Arrival at the Upper Mezzanine:** You reach the upper level and find yourself on the mezzanine, which features an ornate railing.
- **Initial Mezzanine Options:** When you arrive, you are presented with explicit options:
  - `go forward`: you plunged into the mezzanine without looking around, and the unstable flooring gave way beneath you, sending you crashing through the rotten timber. `[DEAD: environmental_hazard]`
  - `look around`: Tells you about the mezzanine, including the stacks and the open part near the railing, opening up navigation.

- **Post-Look Around Options:** Once you have looked around, you are presented with explicit options:
  - `look over railing`: The rotted balcony railing gives way under your weight, sending you plunging straight down into the arms of the creature waiting below. `[DEAD: monster_attack]`
  - `sneak through stacks`: Bypasses the edge and allows you to safely reach the exterior balcony door.

- **The Exterior Balcony Door:** Once you reach the door, you are presented with explicit options:
  - `go out on the balcony`: You push the doors open and step outside, but the heavy metal doors slam and lock permanently behind you, sealing your fate on the unstable ledge. `[DEAD: environmental_hazard]`
  - `inspect balcony`: You pause to look closely and receive a clear clue warning you that the ledge is completely unsafe.

- **Post-Inspection Options:** After inspecting the balcony, you are presented with explicit options:
  - `go out on the balcony`: You ignore the warning and step outside anyway, triggering the heavy metal doors to slam and lock permanently behind you. `[DEAD: environmental_hazard]`
  - `go back`: You attempt to retrace your steps down the stairs to retreat, but the monster has silently tracked you up from the ground floor, cutting off your escape and ambushing you.
    - **`[ITEM CHECK: umbrella]`**
      - **Without Umbrella:** The creature overpowers you instantly in the stairwell. `[DEAD: monster_attack]`
      - **With Umbrella:** You attempt to fend off the beast with the umbrella, but it shreds the frame before dragging you down. `[DEAD: monster_attack]`

---

## Stage 5: The Basement & The Occult Archive
- **Initial Basement Entry:** You find yourself at the top of the collapsed basement stairs. You are presented with explicit options:
  - `go down the stairs`: you stepped out onto the damaged basement stairs, and they crumbled completely underneath you, sending you plunging to your death. `[DEAD: environmental_hazard]`
  - `look around`: You assess the wrecked descent and see the collapsed stairs leading down into darkness.

### Entering the Basement (The Collapsed Stairs & The Descent)
- **Descending the Wreckage:** After looking around, you have the option to `go further`:
  - `go further`:
    - **`[ITEM CHECK: umbrella]`**
      - **Without Umbrella:** you misjudge the drop in the dark, slipping on the slick wood and breaking your neck on the concrete floor below. `[DEAD: environmental_hazard]`
      - **With Umbrella:** You use the large umbrella with its sturdy handle as a cane to carefully navigate down the ruined stairs to the concrete floor below.

### The Flooded Basement & The Swimming Monster
- **Bottom of the Stairs:** Once you reach the bottom of the stairs, your available choices are:
  - `go back`: You try to retreat up the stairs, but you realize the descent has completely collapsed behind you and you cannot return.
  - `enter the water`: You step into the flooded corridor, realizing too late that a monster shares the water with you.

- **First Movement Choice:** Standing in the water, you are presented with explicit options:
  - `jump in`: your frantic splashing echoes through the water, and something massive surges up from the dark and drags you under. `[DEAD: monster_attack]`
  - `enter the water slowly`: You step in carefully, moving on to the next movement choice.

- **Second Movement Choice:** Moving cautiously through the corridor:
  - `start running`: the splash alerts the creature immediately, and it strikes from the dark before you can reach dry ground. `[DEAD: monster_attack]`
  - `go slowly`: You move slowly and quietly, sliding along to the next checkpoint.

- **Third Movement Choice:** Nearing the far side:
  - `rush out of the water`: your movement catches the water's surface, and the creature intercepts you just feet from safety. `[DEAD: monster_attack]`
  - `slowly climb out`: You take your time and slowly climb out of the water onto dry concrete.

### The Occult Stacks, The Cave, & The Final Escape
- **The Gapped Shelving & Hazard:** After getting out of the water, you see a light through a narrow gap between shelving piled high with crazy occult artifacts. You are presented with explicit options:
  - `go towards the light`: you rushed forward without looking and stepped directly onto jagged debris hidden on the floor. `[DEAD: environmental_hazard]`
  - `look around`: You peer through the gap and see what looks like an office with windows that might be a way out, alongside a clear view of an echoing underground cave entrance.

- **Exploring the Office & Desk:**
  - `try the windows`: You test the windows, but they are locked tight.
  - `search desk`: You search the desk, uncovering historical logs and artifacts detailing how an ancient text was mishandled during a storm, inviting the library's horrors.

- **The Cave & The Final Escape:**
  - `approach cave`: You walk toward the cave entrance and spot rotting storm cellar doors. You take one final look around the area, force the rusted latch, shatter the weakened planks, and climb up and out to safety.

