import { giftIdeasToSurface } from "./gifts";
import {
  createGift,
  deleteGift,
  listGifts,
  listImportantDates,
  type CreateGiftInput,
  type RolodexStore,
} from "./queries";

export async function listGiftsIn(
  tenantId: string,
  input: { personId?: string } = {},
  repo?: RolodexStore,
) {
  return listGifts(tenantId, repo, { personId: input.personId });
}

export async function createGiftIn(
  tenantId: string,
  input: CreateGiftInput,
  repo?: RolodexStore,
) {
  return createGift(tenantId, input, repo);
}

export async function deleteGiftIn(
  tenantId: string,
  id: string,
  repo?: RolodexStore,
) {
  return deleteGift(tenantId, id, repo);
}

export async function listGiftIdeasToSurfaceIn(
  tenantId: string,
  personId: string,
  today: string,
  repo?: RolodexStore,
) {
  const [gifts, dates] = await Promise.all([
    listGifts(tenantId, repo, { personId }),
    listImportantDates(tenantId, repo, { personId }),
  ]);
  return giftIdeasToSurface(gifts, dates, today);
}
