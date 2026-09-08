export function spacePageIdFromPath(pathname: string): string | null {
  const match = /^\/space\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

export function isSpacePageCurrent(pathname: string, id: string): boolean {
  return spacePageIdFromPath(pathname) === id;
}
