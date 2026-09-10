/**
 * Demo content for the Space tenant.
 *
 * Split out of `seed.ts` so the seed reads as logic and this file reads as data.
 * Every block carries its payload under `text` (the editor's contract); `divider`
 * is the one type with no text by design. Two rules are enforced by
 * `seed.test.ts`: no seeded page may be blank, and no seeded block may have empty
 * text — so the demo workspace never opens onto an empty editor.
 */
import { type BlockType } from "./constants";

export type SeedBlock = {
  type: BlockType;
  content: Record<string, unknown>;
};

export type SeedPage = {
  title: string;
  icon: string;
  /** Title of the parent page, or null for a root. The seed builds the tree. */
  parent: string | null;
  blocks?: SeedBlock[];
};

function block(
  type: BlockType,
  text: string,
  extra: Record<string, unknown> = {},
): SeedBlock {
  return { type, content: { text, ...extra } };
}

const paragraph = (text: string) => block("paragraph", text);
const h1 = (text: string) => block("heading1", text);
const h2 = (text: string) => block("heading2", text);
const h3 = (text: string) => block("heading3", text);
const bullet = (text: string) => block("bulleted_list", text);
const step = (text: string) => block("numbered_list", text);
const todo = (text: string, checked = false) =>
  block("todo", text, { checked });
const quote = (text: string) => block("quote", text);
const callout = (text: string) => block("callout", text);
const code = (text: string) => block("code", text);
const divider = (): SeedBlock => ({ type: "divider", content: {} });

export const DEMO_PAGES: SeedPage[] = [
  {
    title: "Home",
    parent: null,
    icon: "🏠",
    blocks: [
      h1("Welcome back"),
      paragraph(
        "This is your personal space: notes, plans and lists in one place. Everything here is demo data — poke at it, rename it, break it.",
      ),
      h2("This week"),
      todo("Water the balcony garden", true),
      todo("Order the replacement fan for the home lab"),
      todo("Draft the slow tools essay"),
      todo("Book the Kyoto ryokan before prices move"),
      h2("Why this workspace exists"),
      paragraph(
        "Four apps share one login. CRM keeps the work you're chasing, Space keeps what you're thinking about, Rolodex keeps the people, and Groove is where you go when none of that is working.",
      ),
      quote("Slow is smooth, smooth is fast."),
      divider(),
      h3("Tips"),
      callout(
        "Type / anywhere in an empty block to change its type. Drag the dots on the left to reorder.",
      ),
      h3("Shortcuts"),
      bullet("Search everything with ⌘K"),
      bullet("Click a page title in the sidebar to rename in place"),
      bullet("A database page opens as a table, board, or list"),
      h2("Getting around"),
      step("Pick an app from the top bar, or start at the home launcher"),
      step("Search anything with ⌘K"),
      step("Reset demo from the top bar to put the workspace back"),
      h2("Reference"),
      paragraph(
        "The commands below are the ones worth keeping to hand when the lab box misbehaves.",
      ),
      code("hostnamectl set-hostname node-01"),
      paragraph(
        "Nothing here is precious. Use Reset demo in the top bar to put the whole workspace back the way it started.",
      ),
    ],
  },
  {
    title: "Projects",
    parent: null,
    icon: "🗂️",
    blocks: [
      h1("Projects"),
      paragraph(
        "Anything with an outcome and a finish line. Someday/maybe lists live elsewhere; these are the ones with a decision attached.",
      ),
      callout(
        "Rule of thumb: if it has no next action written down, it isn't a project yet — it's a wish.",
      ),
      h2("Active"),
      bullet(
        "Balcony Garden — plant the spring succession and keep the herbs alive",
      ),
      bullet(
        "Home Lab Rebuild — consolidate three machines into one quiet box",
      ),
      bullet("Writing — ship the slow tools essay, then the network one"),
      bullet("Bike Restoration — strip the frame, repaint, rebuild"),
      h2("Someday"),
      bullet("Learn enough Rust to read the code I depend on"),
      bullet("A proper workbench in the garage"),
      divider(),
      h3("How these get reviewed"),
      step("Weekly: does each project have a next action?"),
      step("Monthly: is this still worth the shelf space?"),
      step("Quarterly: archive anything untouched for ninety days."),
      todo("Re-read the balcony plan before the nursery run"),
    ],
  },
  {
    title: "Balcony Garden",
    parent: "Projects",
    icon: "🌱",
    blocks: [
      h1("Balcony Garden"),
      paragraph(
        "Six square metres facing south-west, four hours of direct light in summer, and a wind tunnel when the weather turns. Everything here is chosen for that.",
      ),
      h2("What's planted"),
      bullet(
        "Tomatoes (two cherries, one plum) — the only thing that reliably works",
      ),
      bullet("Herbs: basil, mint, thyme, rosemary"),
      bullet("Salad leaves, sown in small batches so they don't bolt at once"),
      bullet("Nasturtiums, mostly to distract the aphids"),
      h2("The rotation"),
      paragraph(
        "Sow a small tray every fortnight rather than everything at once. It looks less impressive in week one and feeds us until October.",
      ),
      divider(),
      h3("Jobs"),
      todo("Refill the water reservoir every second evening", true),
      todo("Feed the tomatoes weekly once the second truss sets"),
      todo("Net the fruit before the birds find it"),
      callout(
        "Wind is the real enemy up here. If a plant is tall and top-heavy, it needs a tie before it needs water.",
      ),
      quote("The best fertiliser is the gardener's shadow."),
    ],
  },
  {
    title: "Planting Calendar",
    parent: "Balcony Garden",
    icon: "📅",
    blocks: [
      h1("Planting Calendar"),
      paragraph(
        "What goes in when. Dates assume the coastal Pacific Northwest — shift a fortnight either way if the season argues.",
      ),
      h2("Late winter"),
      bullet("Start tomatoes and peppers indoors under lights"),
      bullet("Chit early potatoes"),
      h3("Spring"),
      bullet("Direct sow salad leaves and radish"),
      bullet("Move hardened-off tomatoes out once nights stay above 10°C"),
      h2("Summer"),
      bullet("Succession-sow salad every two weeks"),
      bullet("Pinch out tomato sideshoots weekly"),
      h3("Autumn"),
      bullet("Sow winter lettuce in the cold frame"),
      bullet("Garlic in — it wants the cold"),
      divider(),
      todo("Order seed potatoes before they sell out"),
      callout(
        "The balcony reads about two weeks ahead of ground level. Sowing by the calendar alone has burned us twice.",
      ),
    ],
  },
  {
    title: "Home Lab Rebuild",
    parent: "Projects",
    icon: "🖥️",
    blocks: [
      h1("Home Lab Rebuild"),
      paragraph(
        "Three machines, four years of accumulated drives, and one very audible fan. The goal is a single quiet box that does everything and a documented way back if it doesn't.",
      ),
      h2("Why now"),
      bullet("Electricity: the old stack idles at 140W"),
      bullet("Noise: audible from the next room"),
      bullet("Backups: three half-finished schemes, none trusted"),
      h2("Target shape"),
      step("One hypervisor host, low power, quiet case"),
      step("Virtualised router and DNS"),
      step("Nightly backups to the NAS, weekly offsite"),
      step("Everything rebuilt from a config repo, not from memory"),
      divider(),
      h3("Decisions"),
      bullet(
        "Storage: mirrored SSDs for the VMs, spinning rust only for archives",
      ),
      bullet("No RGB. Ever."),
      todo("Measure the actual idle draw before buying anything", true),
      code("sudo powertop --auto-tune"),
      callout(
        "Write the runbook as you go. The version of this that lives in your head will not survive a failed disk.",
      ),
    ],
  },
  {
    title: "Parts Inventory",
    parent: "Home Lab Rebuild",
    icon: "📦",
    blocks: [
      h1("Parts Inventory"),
      paragraph(
        "What's actually in the drawers, so the next build starts from stock instead of an order form.",
      ),
      h2("Have"),
      bullet("2 × 1TB NVMe SSD (new, unopened)"),
      bullet("1 × 8-port managed switch, fanless"),
      bullet("Assorted SATA cables — more than anyone needs"),
      bullet("Spare 120mm fans, two of them, quiet models"),
      bullet("Raspberry Pi 4, 4GB — currently a DNS canary"),
      h2("Need"),
      bullet("Low-profile CPU cooler that fits a 2U case"),
      bullet("Two more sticks of ECC memory — matched pair"),
      bullet("Patch cables, short, because the bundle is all 3m"),
      divider(),
      todo("Label the drawer stack before it becomes archaeology"),
      callout(
        "Anything not used in twelve months goes to the donation box. Keep the receipt for the SSDs with the box.",
      ),
    ],
  },
  {
    title: "Network Map",
    parent: "Home Lab Rebuild",
    icon: "🕸️",
    blocks: [
      h1("Network Map"),
      paragraph(
        "The shape of the house network, written down so a reboot at 11pm doesn't turn into guesswork.",
      ),
      h2("Segments"),
      bullet("VLAN 10 — trusted: workstations and phones"),
      bullet("VLAN 20 — IoT: everything that phones home"),
      bullet("VLAN 30 — lab: hypervisor, test VMs, deliberately breakable"),
      bullet("VLAN 40 — guest: internet only, nothing local"),
      h2("Services"),
      bullet("DNS: internal resolver, forwarded and cached"),
      bullet("DHCP: reservations for anything that matters"),
      bullet("VPN: split tunnel, home subnet only"),
      divider(),
      code("ip -brief addr show"),
      h3("Known sharp edges"),
      bullet(
        "The IoT VLAN cannot reach the NAS — by design, checked quarterly",
      ),
      bullet("Guest Wi-Fi bridges to the same switch port; don't move it"),
      callout(
        "If the router is unreachable, check the hypervisor host first: the router is a guest on it.",
      ),
      quote("Document the network or the network will document you."),
    ],
  },
  {
    title: "Writing",
    parent: "Projects",
    icon: "✍️",
    blocks: [
      h1("Writing"),
      paragraph(
        "Two things on the go and a drawer of ideas. The bar for publishing is simple: would I send this to someone I respect?",
      ),
      h2("In progress"),
      bullet(
        "Blog: Slow Tools — why the fastest stack is rarely the one you maintain",
      ),
      bullet("Essay: the network engineer's case for boring infrastructure"),
      h2("What works"),
      step("Draft badly, in one sitting, with no outline"),
      step("Leave it overnight"),
      step("Cut the first paragraph — it was warm-up"),
      step("Read it aloud; anywhere you stumble is where a reader stops"),
      divider(),
      todo("Finish the slow tools draft before the end of the month"),
      callout(
        "Publishing beats polishing. A published draft teaches you more than a perfect unpublished one.",
      ),
    ],
  },
  {
    title: "Blog: Slow Tools",
    parent: "Writing",
    icon: "📝",
    blocks: [
      h1("Blog: Slow Tools"),
      paragraph(
        "Working draft. The thesis: tools you can hold in your head outlast tools that are merely fast to start with.",
      ),
      h2("Opening"),
      paragraph(
        "Every stack I've inherited was fast to build and slow to understand. Every stack I've been sad to leave was the other way round.",
      ),
      h2("Argument"),
      bullet("Speed at authoring time is paid for at debugging time"),
      bullet("A tool you can reason about beats a tool you have to look up"),
      bullet("Boring infrastructure is a feature, not a compromise"),
      bullet("The best abstraction is the one you could delete tomorrow"),
      quote("A slow tool is one whose failure modes you have already met."),
      h2("To do"),
      todo(
        "Add the two examples from the school district work — anonymised",
        true,
      ),
      todo("Cut the middle section; it repeats the opening"),
      todo("Find a closing image that isn't a metaphor about gardening"),
      divider(),
      callout("Target length: 1,200 words. Currently closer to 1,900."),
    ],
  },
  {
    title: "Essay Ideas",
    parent: "Writing",
    icon: "🗒️",
    blocks: [
      h1("Essay Ideas"),
      paragraph("Half-thoughts, kept so they stop taking up working memory."),
      bullet("The maintenance window as a moral position"),
      bullet("Why documentation is a form of kindness to your future self"),
      bullet("What twelve years of uptime teaches you about attention"),
      bullet("Interfaces that assume you're busy are better interfaces"),
      bullet("On the pleasure of a finished checklist"),
      divider(),
      h3("Maybe not"),
      bullet("Anything that starts with 'in the age of AI'"),
      bullet("A post about post length"),
      callout(
        "If an idea can't survive being written down twice, it wasn't an idea — it was a mood.",
      ),
    ],
  },
  {
    title: "Bike Restoration",
    parent: "Projects",
    icon: "🚲",
    blocks: [
      h1("Bike Restoration"),
      paragraph(
        "A 1987 steel frame, rescued from a garage, with more rust than paint. Plan: strip, treat, repaint, rebuild with modern parts where it matters.",
      ),
      h2("Order of work"),
      step("Photograph everything before a single bolt moves"),
      step("Strip to the frame; bag and label the parts"),
      step("Treat the rust, prime, paint, cure properly"),
      step("Rebuild with a new drivetrain and keep the original bars"),
      h2("Parts to source"),
      bullet("8-speed groupset — the frame spacing allows it"),
      bullet("Rigid fork, correct rake, threaded steerer"),
      bullet("Bar tape in something awful, as a joke"),
      divider(),
      todo("Find a framebuilder who can chase the threads"),
      quote("It's not a restoration until something is irreversibly wrong."),
      callout(
        "Budget twice what you think, and expect the bottom bracket to be the discovery that changes the plan.",
      ),
    ],
  },
  {
    title: "Travel",
    parent: null,
    icon: "✈️",
    blocks: [
      h1("Travel"),
      paragraph(
        "Two trips in the pipeline, one long-running points game, and a packing list that has finally stopped changing.",
      ),
      h2("Planning now"),
      bullet("Japan 2026 — ten days, Tokyo and Kyoto, booked"),
      bullet("Lisbon — long weekend, still just flights in a tab"),
      h2("The standing rules"),
      step("One carry-on, whatever the length of the trip"),
      step("Book the first night properly; improvise after"),
      step("Always leave one day unplanned"),
      divider(),
      callout(
        "The Trip Planner database holds the actual itineraries — this page is just the philosophy.",
      ),
      todo("Renew the passport before the six-month window closes", true),
    ],
  },
  {
    title: "Japan 2026",
    parent: "Travel",
    icon: "🗾",
    blocks: [
      h1("Japan 2026"),
      paragraph(
        "Ten days in October: four in Tokyo, five in Kyoto, one written off to jet lag and trains.",
      ),
      h2("Tokyo"),
      bullet("Stay: west side, near a JR loop line"),
      bullet(
        "Do: the fish market early, a long walk through Yanaka, one record shop",
      ),
      bullet(
        "Eat: standing soba, one proper omakase, everything from a convenience store at least once",
      ),
      h2("Kyoto"),
      bullet("Stay: a ryokan for two nights, then something cheap"),
      bullet(
        "Do: temples at opening time, the philosopher's path, one day trip to Nara",
      ),
      bullet("Eat: tofu kaiseki once, then all the noodles"),
      divider(),
      h3("Booked / to book"),
      todo("Flights — booked, aisle seats both ways", true),
      todo("Ryokan — book before prices move"),
      todo("Rail pass — buy before arrival"),
      callout("Cash still matters more than you'd think. Carry it."),
    ],
  },
  {
    title: "Tokyo Food Shortlist",
    parent: "Japan 2026",
    icon: "🍜",
    blocks: [
      h1("Tokyo Food Shortlist"),
      paragraph(
        "Ordered by how annoyed we'd be to miss it. Nothing here needs a reservation except the one that does.",
      ),
      h2("Must"),
      bullet("Standing soba near the office district — lunch only, cash"),
      bullet("The omakase counter — book the moment the window opens"),
      bullet("Tamago sandwich from the station kiosk, eaten on the platform"),
      h2("If nearby"),
      bullet("Curry that has been simmering since the morning"),
      bullet("A kissaten with one elderly proprietor and very good toast"),
      divider(),
      todo("Check which of these close on Wednesdays"),
      quote(
        "Ask the hotel desk, then ignore half of what they say and follow the queue.",
      ),
      callout(
        "Book the counter seat first — everything else can be improvised.",
      ),
    ],
  },
  {
    title: "Kyoto Notes",
    parent: "Japan 2026",
    icon: "⛩️",
    blocks: [
      h1("Kyoto Notes"),
      paragraph(
        "Kyoto rewards being early and punishes being efficient. Fewer places, earlier starts.",
      ),
      h2("Plan by time of day"),
      bullet(
        "Before 7am: the famous ones, while they're still a place rather than a queue",
      ),
      bullet("Midday: somewhere with a garden and nowhere to be"),
      bullet("Evening: the river, and whatever's open"),
      h2("Deliberately skipped"),
      bullet("Anything on a tour bus route in the middle of the day"),
      bullet("The bamboo grove, on someone else's advice"),
      divider(),
      todo("Reserve the ryokan", true),
      todo("Work out the bus pass — the subway doesn't cover it"),
      callout(
        "Two temples a day is the correct number. Three is a forced march.",
      ),
    ],
  },
  {
    title: "Points and Miles",
    parent: "Travel",
    icon: "🎫",
    blocks: [
      h1("Points and Miles"),
      paragraph(
        "A slow game. The only rule that matters: earn where you already spend, and never pay interest for a point.",
      ),
      h2("Where we stand"),
      bullet(
        "Airline miles — enough for one long-haul in economy, almost enough for premium",
      ),
      bullet("Hotel points — two free nights, saved for the expensive city"),
      bullet("Transferable currency — the flexible half, deliberately unspent"),
      h2("Strategy"),
      step("Hold transferables until the seat is available"),
      step("Never transfer speculatively — transfers don't reverse"),
      step("Book the hard leg first, then fill in around it"),
      divider(),
      todo("Check award space again the first Tuesday of the month"),
      callout(
        "Points are a discount, not a hobby. If tracking them takes an evening a week, you're working for the airline.",
      ),
    ],
  },
  {
    title: "Packing Checklist",
    parent: "Travel",
    icon: "🧳",
    blocks: [
      h1("Packing Checklist"),
      paragraph(
        "One carry-on, any trip length. The list hasn't changed in three years, which is the point.",
      ),
      h2("Clothes"),
      todo("Three shirts — one worn, two packed", true),
      todo("Two pairs of trousers, one of which can pass as smart", true),
      todo("Seven days of underwear, compressed"),
      todo("One layer for cold, one for rain"),
      h2("Everything else"),
      todo("Documents: passport, cards, one photocopy of each", true),
      todo("Chargers, adapters, one power bank", true),
      todo("Medicine and the small first-aid kit", true),
      todo("A book, physical, for the parts of the trip with no signal"),
      divider(),
      h3("Rules"),
      bullet(
        "If it isn't on the list and the trip is under two weeks, you can buy it there",
      ),
      bullet("Pack the night before, never the morning of"),
      callout("The bag got lighter every trip. It's nearly right."),
    ],
  },
  {
    title: "Notes",
    parent: null,
    icon: "🧠",
    blocks: [
      h1("Notes"),
      paragraph(
        "The junk drawer, kept tidy: recipes worth repeating, quotes worth stealing, films worth an evening, and an inbox for ideas not yet ready to be projects.",
      ),
      h2("Sections"),
      bullet("Recipes — the ones that survived being cooked twice"),
      bullet("Quotes — lines that changed how I think about a problem"),
      bullet("Films to Watch — no commentary, no ratings, just the list"),
      bullet("Ideas Inbox — unsorted, unfiltered, unjudged"),
      divider(),
      callout(
        "Nothing here needs to be finished. This is where thoughts go to be found later, not to be managed.",
      ),
      todo("Prune the Ideas Inbox once a month"),
    ],
  },
  {
    title: "Recipes",
    parent: "Notes",
    icon: "🍝",
    blocks: [
      h1("Recipes"),
      paragraph(
        "Only the ones that earned a repeat. Quantities are approximate because that's how they were learned.",
      ),
      h2("Weeknight"),
      bullet("Sourdough, Slowly — the long ferment, written up properly"),
      bullet("Beans on toast, done with actual care"),
      bullet("Cold noodles with whatever's in the fridge"),
      h2("Worth the effort"),
      bullet("A proper ragù — four hours, mostly unattended"),
      bullet("Roast chicken, then stock from the bones the next day"),
      divider(),
      callout(
        "Write the change you made, not just the recipe. The change is the part you'll want next time.",
      ),
      todo("Type up the ragù version that worked"),
    ],
  },
  {
    title: "Sourdough, Slowly",
    parent: "Recipes",
    icon: "🍞",
    blocks: [
      h1("Sourdough, Slowly"),
      paragraph(
        "A starter called Doris, fed for four years, and one loaf recipe with very few moving parts.",
      ),
      h2("Timeline"),
      step("Evening — feed the starter, leave it out"),
      step("Morning — mix, rest, fold every half hour for three hours"),
      step("Afternoon — shape, then a cold retard overnight"),
      step("Next morning — bake in a hot covered pot"),
      h2("What actually matters"),
      bullet("Hydration around 75% — wetter is harder, not better"),
      bullet("Salt late, so the autolyse does its work"),
      bullet("A hot pot does more for the crust than any steam trick"),
      divider(),
      code("bake 250C covered 20m, uncovered 230C 22m"),
      todo("Feed Doris before the weekend", true),
      quote("Watch the dough, not the clock."),
      callout(
        "If the crumb is tight and the crust is pale, the bake was too short — not the recipe.",
      ),
    ],
  },
  {
    title: "Quotes",
    parent: "Notes",
    icon: "💬",
    blocks: [
      h1("Quotes"),
      paragraph(
        "Lines that did some work on me. No attribution notes, because half of them are misattributed anyway.",
      ),
      quote("Slow is smooth, smooth is fast."),
      quote("The best fertiliser is the gardener's shadow."),
      quote("Amateurs talk strategy. Professionals talk logistics."),
      quote(
        "A ship in harbour is safe, but that is not what ships are built for.",
      ),
      quote("Nothing is so permanent as a temporary fix."),
      divider(),
      callout(
        "Add a line only if it changed a decision. Otherwise it's decoration.",
      ),
    ],
  },
  {
    title: "Films to Watch",
    parent: "Notes",
    icon: "🎬",
    blocks: [
      h1("Films to Watch"),
      paragraph(
        "The queue. No ratings, no commentary — that's a different page, and it doesn't exist.",
      ),
      h2("Next up"),
      bullet("A 1970s paranoia thriller — the one everyone recommends"),
      bullet("The three-hour Japanese family drama"),
      bullet("Something loud, for a Friday"),
      h2("Long overdue"),
      bullet("The documentary about the bridge"),
      bullet("Whatever won the year we stopped paying attention"),
      divider(),
      todo("Check which of these is actually streaming"),
      callout(
        "One in, one out. If the list is over twenty, it's an obligation, not a pleasure.",
      ),
    ],
  },
  {
    title: "Ideas Inbox",
    parent: "Notes",
    icon: "💡",
    blocks: [
      h1("Ideas Inbox"),
      paragraph(
        "Unprocessed on purpose. Things land here so they stop interrupting, and get sorted when there's attention to spare.",
      ),
      bullet("A CLI that answers 'what changed on this box last week'"),
      bullet("A reading log that tracks where an idea came from"),
      bullet("Weekly review as a single HTML page you can print"),
      bullet("A lab notebook that isn't a wiki"),
      bullet("Something for the newsletter that isn't a list of events"),
      divider(),
      todo("Sort this once a month — promote, schedule, or delete"),
      callout(
        "An idea that survives three months in here is worth a page of its own.",
      ),
    ],
  },
  {
    title: "Health & Habits",
    parent: null,
    icon: "💪",
    blocks: [
      h1("Health & Habits"),
      paragraph(
        "The boring foundation: lift something heavy twice a week, sleep enough, walk daily. Tracked lightly so the tracking doesn't become the project.",
      ),
      h2("Non-negotiables"),
      bullet("Three sessions a week — two lifting, one long walk"),
      bullet("Lights out before 23:00 on weeknights"),
      bullet("Sunlight within an hour of waking"),
      divider(),
      callout(
        "A missed day is noise. A missed week is a trend. The only rule is: never miss twice.",
      ),
      todo("Log last night's sleep", true),
      h2("This month's focus"),
      paragraph(
        "Consistency over intensity. No new programmes until the current one has run eight weeks.",
      ),
    ],
  },
  {
    title: "Training Plan",
    parent: "Health & Habits",
    icon: "🏋️",
    blocks: [
      h1("Training Plan"),
      paragraph(
        "Two lifting sessions and one long walk. Simple enough to keep when the week goes sideways.",
      ),
      h2("Session A"),
      bullet("Squat — work up to a hard set of five"),
      bullet("Bench — same, then back off"),
      bullet("Row — three sets, strict"),
      h2("Session B"),
      bullet("Deadlift — one heavy set, done"),
      bullet("Overhead press — five sets of five"),
      bullet("Pull-ups — as many clean sets as possible"),
      divider(),
      h3("Standards"),
      bullet("Leave two reps in reserve on everything except the deadlift"),
      bullet("If the warm-up feels heavy, cut the top set"),
      todo(
        "Book the physio for the shoulder before it becomes a problem",
        true,
      ),
      callout(
        "Progress is measured in months. Anything faster is a peak, not a trend.",
      ),
    ],
  },
  {
    title: "Sleep Log",
    parent: "Health & Habits",
    icon: "😴",
    blocks: [
      h1("Sleep Log"),
      paragraph(
        "Rough notes, not measurements. The pattern matters more than the number.",
      ),
      h2("What the last month says"),
      bullet(
        "Best nights followed days with real daylight and no late screens",
      ),
      bullet("Worst nights followed late admin work at the desk"),
      bullet("Caffeine after 14:00 costs an hour, reliably"),
      divider(),
      h3("Experiments"),
      step("Two weeks: no screens after 22:00"),
      step("Two weeks: same wake time at the weekend"),
      todo("Write the wake time down for seven days straight"),
      quote("Sleep is not the reward for finishing. It's the equipment."),
      callout("If the log is hard to keep, track one thing. One."),
    ],
  },
  {
    title: "Work",
    parent: null,
    icon: "💼",
    blocks: [
      h1("Work"),
      paragraph(
        "The working corner: a weekly review that actually happens, a map of who does what, and notes from meetings worth remembering.",
      ),
      h2("The rhythm"),
      bullet("Monday: pick three outcomes for the week"),
      bullet("Wednesday: check nothing has gone quiet"),
      bullet("Friday: write down what moved, and what didn't"),
      divider(),
      callout(
        "If the weekly review slips two weeks running, the problem isn't the review — it's the week.",
      ),
      todo("Block Friday afternoon for the review, recurring"),
    ],
  },
  {
    title: "Weekly Review",
    parent: "Work",
    icon: "🔁",
    blocks: [
      h1("Weekly Review"),
      paragraph(
        "Thirty minutes, same time, same three questions. The template hasn't changed because it works.",
      ),
      h2("The three questions"),
      step("What actually moved this week?"),
      step("What went quiet that shouldn't have?"),
      step("What are the three outcomes for next week?"),
      h2("Then"),
      bullet("Empty the inbox to zero, or to a decision"),
      bullet("Update every active project with a next action"),
      bullet("Book anything that needs another person"),
      divider(),
      quote(
        "A review that doesn't change next week's plan was a status report.",
      ),
      todo("Rename this year's review pages consistently"),
      callout(
        "Keep it to thirty minutes. Longer means it's becoming a project of its own.",
      ),
    ],
  },
  {
    title: "Who Does What",
    parent: "Work",
    icon: "👥",
    blocks: [
      h1("Who Does What"),
      paragraph(
        "The map that saves asking. Owner, backup, and where the runbook lives.",
      ),
      h2("Ownership"),
      bullet("Network and firewalls — me; backup: the other one"),
      bullet("Identity and access — me"),
      bullet("Endpoint fleet — the team; backup: me"),
      bullet("Vendor relationships — the other one"),
      divider(),
      h3("Rules that keep this honest"),
      bullet("One owner per thing. A shared owner is an unowned thing."),
      bullet("Every owner has a named backup who has done it once for real"),
      bullet("If it's not written down, it isn't owned — it's remembered"),
      todo("Review this page every quarter and delete anything stale"),
      callout(
        "The handover test: could the backup do it next week without calling you?",
      ),
    ],
  },
  {
    title: "Meeting Notes",
    parent: "Work",
    icon: "📓",
    blocks: [
      h1("Meeting Notes"),
      paragraph(
        "One page per meeting that produced a decision. Everything else gets deleted, which is most of it.",
      ),
      h2("Format"),
      step("Who was there, and what they wanted"),
      step("What was decided"),
      step("What happens next, and who owns it"),
      divider(),
      callout(
        "If a meeting produced no decision and no next action, write 'nothing decided' and move on. That's a valid note.",
      ),
      bullet("Kickoff — Platform Kickoff, see the child page"),
      todo("Delete notes older than a year that no one has opened"),
    ],
  },
  {
    title: "Platform Kickoff",
    parent: "Meeting Notes",
    icon: "🚀",
    blocks: [
      h1("Platform Kickoff"),
      paragraph(
        "First session for the platform migration. Two hours, six people, one decision made and three deliberately deferred.",
      ),
      h2("Decided"),
      bullet(
        "Migrate in place rather than a parallel build — the parallel build never converges",
      ),
      bullet("Keep the current identity provider for the first phase"),
      bullet("Freeze new integrations until the first cutover lands"),
      h2("Deferred"),
      bullet("Network segmentation redesign — after cutover, not during"),
      bullet("Monitoring replacement — needs its own session"),
      bullet("The naming argument — park it, it's a distraction at this stage"),
      divider(),
      todo("Publish the cutover date within a week", true),
      todo("Write the rollback plan before anything else"),
      quote("A migration plan without a rollback is a bet, not a plan."),
      callout(
        "Next session: monitoring, with the data from two weeks of the current stack.",
      ),
    ],
  },
  {
    title: "Learning",
    parent: null,
    icon: "🎓",
    blocks: [
      h1("Learning"),
      paragraph(
        "Learning with a deadline attached. Reading for its own sake belongs in the notes, not here.",
      ),
      h2("Current"),
      bullet("Rust — enough to read and modify, not to be clever"),
      bullet("Keyboard shortcuts that pay rent"),
      h2("How this works"),
      step("Pick one thing per quarter"),
      step("Build something small that fails loudly"),
      step("Write down what surprised me"),
      divider(),
      callout(
        "If I can't explain it to someone in three sentences, I've been reading, not learning.",
      ),
      todo("Set the next quarter's target before this one ends"),
    ],
  },
  {
    title: "Rust Notes",
    parent: "Learning",
    icon: "🦀",
    blocks: [
      h1("Rust Notes"),
      paragraph(
        "Notes from reading and rebuilding things, kept in the order they finally made sense.",
      ),
      h2("The parts that clicked"),
      bullet(
        "Ownership is about who frees the memory, and the compiler just makes you decide",
      ),
      bullet("Result is a decision you can't forget to make"),
      bullet("Borrowing is a rule about aliasing, not about pointers"),
      bullet("Pattern matching is the part I want everywhere else"),
      divider(),
      h3("Still hazy"),
      bullet("Lifetimes in structs with more than one reference"),
      bullet("Async traits, and why the workarounds exist"),
      code("cargo clippy -- -D warnings"),
      todo(
        "Rewrite the small log parser in Rust and compare the error handling",
      ),
      callout(
        "Rust's compiler errors were the best documentation I read this year.",
      ),
    ],
  },
  {
    title: "Shortcuts Worth Learning",
    parent: "Learning",
    icon: "⌨️",
    blocks: [
      h1("Shortcuts Worth Learning"),
      paragraph(
        "Only the ones I actually kept. A shortcut you have to look up is slower than the mouse.",
      ),
      h2("Every day"),
      bullet("⌘K — search everything"),
      bullet("⌘ShiftT — reopen the tab you just closed"),
      bullet("Ctrl+A, Ctrl+E — start and end of line, in every shell"),
      h2("Worth the effort"),
      bullet("Ctrl+R — reverse search through history"),
      bullet("Ctrl+X Ctrl+E — edit the current command in an editor"),
      divider(),
      callout(
        "Learn one at a time, for a week, in real work. Ten at once and you'll keep none.",
      ),
      todo("Pick the next one: tmux panes, or vim motions"),
    ],
  },
  {
    title: "Archive",
    parent: null,
    icon: "🗄️",
    blocks: [
      h1("Archive"),
      paragraph(
        "Finished, closed, or simply no longer alive. Kept because the record is sometimes useful, not because the work is.",
      ),
      h2("What lives here"),
      bullet("Projects that shipped"),
      bullet("Projects that died, with a line on why"),
      bullet("Yearly reviews, once they're written"),
      divider(),
      callout(
        "Nothing here gets edited. The value is in it being a fixed record.",
      ),
      bullet("2025 in Review — see the child page"),
    ],
  },
  {
    title: "2025 in Review",
    parent: "Archive",
    icon: "🧾",
    blocks: [
      h1("2025 in Review"),
      paragraph(
        "Written in January, unedited since. The point isn't the summary — it's that half of what felt urgent turned out not to matter.",
      ),
      h2("What moved"),
      bullet(
        "The lab went from three machines to one, and the power bill noticed",
      ),
      bullet("Learned enough Rust to be useful in a codebase I don't own"),
      bullet("The garden fed us from June to October"),
      h2("What didn't"),
      bullet(
        "The automation project that spent eleven months in a planning doc",
      ),
      bullet("Two certifications that changed nothing"),
      divider(),
      quote(
        "Most of what I planned was wrong, and most of what happened wasn't planned.",
      ),
      h3("Carried into this year"),
      todo("Fewer open loops — close them or bin them", true),
      todo("Write more, publish sooner"),
      callout("Next review: same six questions, one page, in January."),
    ],
  },
];

/** Reading List rows, keyed by property name so ids resolve at seed time. */
export const READING_LIST_ROWS: {
  title: string;
  values: Record<string, string | number | boolean>;
}[] = [
  {
    title: "Dune",
    values: {
      Author: "Frank Herbert",
      Status: "Finished",
      Rating: 5,
      Pages: 617,
    },
  },
  {
    title: "Thinking in Systems",
    values: {
      Author: "Donella Meadows",
      Status: "Finished",
      Rating: 5,
      Pages: 240,
    },
  },
  {
    title: "The Design of Everyday Things",
    values: { Author: "Don Norman", Status: "Finished", Rating: 4, Pages: 368 },
  },
  {
    title: "Seeing Like a State",
    values: {
      Author: "James C. Scott",
      Status: "Reading",
      Rating: 4,
      Pages: 445,
    },
  },
  {
    title: "A Pattern Language",
    values: {
      Author: "Christopher Alexander",
      Status: "Reading",
      Rating: 5,
      Pages: 1171,
    },
  },
  {
    title: "The Timeless Way of Building",
    values: {
      Author: "Christopher Alexander",
      Status: "Queued",
      Rating: 0,
      Pages: 552,
    },
  },
  {
    title: "Staff Engineer",
    values: { Author: "Will Larson", Status: "Queued", Rating: 0, Pages: 226 },
  },
  {
    title: "Shop Class as Soulcraft",
    values: {
      Author: "Matthew B. Crawford",
      Status: "Shelved",
      Rating: 3,
      Pages: 246,
    },
  },
];
