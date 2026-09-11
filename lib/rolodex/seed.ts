import { type Circle } from "./constants";
import { addDaysISO, todayISO } from "./dates";
import {
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createNews,
  createPerson,
  createReminder,
  listPeople,
  type RolodexRepository,
} from "./queries";
import type { WriteOpts } from "../db/batch-transaction";

const DEMO_PEOPLE: {
  name: string;
  circle: Circle;
  company: string;
  city: string;
  tags: string[];
}[] = [
  {
    name: "Maya Chen",
    circle: "inner",
    company: "Figma",
    city: "Oakland",
    tags: ["family"],
  },
  {
    name: "Sam Okoye",
    circle: "inner",
    company: "Northwind",
    city: "Chicago",
    tags: ["university"],
  },
  {
    name: "Kate Okoye",
    circle: "inner",
    company: "Harbor Lane",
    city: "Chicago",
    tags: ["family"],
  },
  {
    name: "Luis Andrade",
    circle: "inner",
    company: "Bluepeak",
    city: "Austin",
    tags: ["cycling"],
  },
  {
    name: "Priya Shah",
    circle: "inner",
    company: "Neon",
    city: "Seattle",
    tags: ["work"],
  },
  {
    name: "Jonah Reed",
    circle: "inner",
    company: "Cascade",
    city: "Portland",
    tags: ["cycling"],
  },
  {
    name: "Elena Voss",
    circle: "inner",
    company: "ReconIQ",
    city: "Denver",
    tags: ["work"],
  },
  {
    name: "Noah Park",
    circle: "inner",
    company: "Evergreen",
    city: "Vancouver",
    tags: ["family"],
  },
  {
    name: "Amelia Brooks",
    circle: "close",
    company: "Stripe",
    city: "New York",
    tags: ["university"],
  },
  {
    name: "Diego Morales",
    circle: "close",
    company: "Notion",
    city: "Los Angeles",
    tags: ["work"],
  },
  {
    name: "Hannah Kim",
    circle: "close",
    company: "Linear",
    city: "Toronto",
    tags: ["work"],
  },
  {
    name: "Omar Haddad",
    circle: "close",
    company: "Vercel",
    city: "Miami",
    tags: ["ex-colleague"],
  },
  {
    name: "Sofia Berg",
    circle: "close",
    company: "Ikea",
    city: "Stockholm",
    tags: ["university"],
  },
  {
    name: "Theo Nkrumah",
    circle: "close",
    company: "Andela",
    city: "Accra",
    tags: ["work"],
  },
  {
    name: "Iris Patel",
    circle: "close",
    company: "Shopify",
    city: "Ottawa",
    tags: ["cycling"],
  },
  {
    name: "Ben Carter",
    circle: "close",
    company: "GitHub",
    city: "Boston",
    tags: ["work"],
  },
  {
    name: "Yara Mansour",
    circle: "wider",
    company: "Arsenal",
    city: "London",
    tags: ["university"],
  },
  {
    name: "Felix Nguyen",
    circle: "wider",
    company: "Canva",
    city: "Sydney",
    tags: ["work"],
  },
  {
    name: "Clara Jensen",
    circle: "wider",
    company: "Lego",
    city: "Billund",
    tags: ["family"],
  },
  {
    name: "Mateo Silva",
    circle: "wider",
    company: "Nubank",
    city: "São Paulo",
    tags: ["work"],
  },
  {
    name: "Aisha Rahman",
    circle: "wider",
    company: "Grab",
    city: "Singapore",
    tags: ["university"],
  },
  {
    name: "Owen Blake",
    circle: "wider",
    company: "Basecamp",
    city: "Chicago",
    tags: ["ex-colleague"],
  },
  {
    name: "Nina Kowalski",
    circle: "wider",
    company: "CD Projekt",
    city: "Warsaw",
    tags: ["work"],
  },
  {
    name: "Jamal Wright",
    circle: "wider",
    company: "Spotify",
    city: "Atlanta",
    tags: ["cycling"],
  },
  {
    name: "Ines Duarte",
    circle: "distant",
    company: "Farfetch",
    city: "Lisbon",
    tags: ["university"],
  },
  {
    name: "Ravi Mehta",
    circle: "distant",
    company: "Infosys",
    city: "Bengaluru",
    tags: ["work"],
  },
  {
    name: "Helen Frost",
    circle: "distant",
    company: "BBC",
    city: "Manchester",
    tags: ["ex-colleague"],
  },
  {
    name: "Kenji Sato",
    circle: "distant",
    company: "Rakuten",
    city: "Tokyo",
    tags: ["work"],
  },
  {
    name: "Lila Moreau",
    circle: "distant",
    company: "Deezer",
    city: "Paris",
    tags: ["university"],
  },
  {
    name: "Peter Novak",
    circle: "distant",
    company: "Skoda",
    city: "Prague",
    tags: ["cycling"],
  },
  {
    name: "Fatima El-Sayed",
    circle: "distant",
    company: "CIB",
    city: "Cairo",
    tags: ["work"],
  },
  {
    name: "Chris Lang",
    circle: "distant",
    company: "Atlassian",
    city: "Sydney",
    tags: ["ex-colleague"],
  },
];

function monthOffset(
  fromISO: string,
  offset: number,
): { month: number; day: number } {
  const [year, month] = fromISO.split("-").map(Number) as [number, number];
  const total = year * 12 + (month - 1) + offset;
  return { month: (total % 12) + 1, day: 15 };
}

export async function seedRolodex(
  tenantId: string,
  repo?: RolodexRepository,
  opts?: WriteOpts,
): Promise<void> {
  // A reset collects the wipe and this reseed into one batch, so the
  // rows are still there to be found: the idempotence check only applies
  // to a standalone seed (`npm run db:seed`), which runs immediately.
  if (!opts?.batch) {
    const existing = await listPeople(tenantId, repo);
    if (existing.length > 0) {
      return;
    }
  }

  const today = todayISO();
  const created = [];
  for (const person of DEMO_PEOPLE) {
    created.push(
      await createPerson(
        tenantId,
        {
          name: person.name,
          company: person.company,
          city: person.city,
          circle: person.circle,
          email: `${person.name.toLowerCase().replaceAll(" ", ".")}@example.com`,
          tags: person.tags,
        },
        repo,
        opts,
      ),
    );
  }

  const maya = created[0]!;
  const sam = created[1]!;
  const kate = created[2]!;

  await createInteraction(
    tenantId,
    {
      personId: maya.id,
      type: "call",
      date: addDaysISO(today, -400),
      notes: "Caught up after the move.",
    },
    repo,
    opts,
  );
  await createInteraction(
    tenantId,
    { personId: sam.id, type: "met", date: addDaysISO(today, -20) },
    repo,
    opts,
  );

  const next1 = monthOffset(today, 1);
  const next2 = monthOffset(today, 2);
  const next3 = monthOffset(today, 3);
  await createImportantDate(
    tenantId,
    {
      personId: maya.id,
      type: "birthday",
      month: next1.month,
      day: next1.day,
      year: 1994,
    },
    repo,
    opts,
  );
  await createImportantDate(
    tenantId,
    {
      personId: sam.id,
      type: "birthday",
      month: next2.month,
      day: next2.day,
      year: 1990,
    },
    repo,
    opts,
  );
  await createImportantDate(
    tenantId,
    {
      personId: kate.id,
      type: "birthday",
      month: next3.month,
      day: next3.day,
      year: 2018,
    },
    repo,
    opts,
  );
  await createImportantDate(
    tenantId,
    { personId: sam.id, type: "birthday", month: 2, day: 29, year: 1988 },
    repo,
    opts,
  );

  await createFact(
    tenantId,
    { personId: maya.id, text: "Allergic to shellfish" },
    repo,
    opts,
  );
  await createNews(
    tenantId,
    {
      personId: maya.id,
      text: "Started at Figma",
      date: addDaysISO(today, -40),
    },
    repo,
    opts,
  );
  await createReminder(
    tenantId,
    {
      personId: sam.id,
      text: "Send the hiking map",
      dueDate: addDaysISO(today, 5),
    },
    repo,
    opts,
  );
  await createGift(
    tenantId,
    {
      personId: kate.id,
      name: "Field notes notebook",
      kind: "idea",
      occasion: "birthday",
      date: today,
    },
    repo,
    opts,
  );
  await createConnection(
    tenantId,
    {
      personA: sam.id,
      personB: kate.id,
      kind: "partner",
      label: "partner",
      inverseLabel: "partner",
    },
    repo,
    opts,
  );
}
