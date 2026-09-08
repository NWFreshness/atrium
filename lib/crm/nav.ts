export function isCrmSection(pathname: string, href: string): boolean {
  if (href === "/crm") {
    return pathname === "/crm";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
