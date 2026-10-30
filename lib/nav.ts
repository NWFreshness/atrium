/** True when `pathname` is inside the subnav section at `href`; the app root matches only exactly. */
export function isSection(
  pathname: string,
  root: string,
  href: string,
): boolean {
  if (href === root) {
    return pathname === root;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
