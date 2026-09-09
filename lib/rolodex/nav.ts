export function isRolodexSection(pathname: string, href: string): boolean {
  if (href === "/rolodex") {
    return pathname === "/rolodex";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
