import type { ConnectionKind } from "./constants";
import type { Connection, Person } from "./queries";

export type ConnectionView = {
  id: string;
  otherId: string;
  otherName: string;
  kind: ConnectionKind;
  description: string;
  note: string | null;
};

export function describeConnection(
  personId: string,
  connection: Connection,
  otherName: string,
): string {
  switch (connection.kind) {
    case "partner":
      return `Partner of ${otherName}`;
    case "sibling":
      return `Sibling of ${otherName}`;
    case "colleague":
      return connection.note
        ? `Colleague of ${otherName} — ${connection.note}`
        : `Colleague of ${otherName}`;
    case "parent_child": {
      const isParent =
        connection.aIsParent === (personId === connection.personA);
      return isParent ? `Parent of ${otherName}` : `Child of ${otherName}`;
    }
    case "other":
      return personId === connection.personA
        ? connection.label || `Connected to ${otherName}`
        : connection.inverseLabel || `Connected to ${otherName}`;
  }
}

export function connectionViews(
  personId: string,
  connections: Connection[],
  people: Pick<Person, "id" | "name">[],
): ConnectionView[] {
  const names = new Map(people.map((person) => [person.id, person.name]));
  return connections
    .filter((row) => row.personA === personId || row.personB === personId)
    .map((row) => {
      const otherId = row.personA === personId ? row.personB : row.personA;
      const otherName = names.get(otherId) ?? "";
      return {
        id: row.id,
        otherId,
        otherName,
        kind: row.kind,
        description: describeConnection(personId, row, otherName),
        note: row.note,
      };
    });
}
