const KEY = "dc-viewing-site-as-admin";

/**
 * Marks that an owner/staff account chose to browse the public site (via
 * "Ver site" in the admin panel), so SitePage/AccountPage stop bouncing it
 * back to /admin for the rest of this tab's session — letting them use the
 * same flow a customer would, e.g. to book an appointment for themselves.
 */
export function markViewingSiteAsAdmin() {
  sessionStorage.setItem(KEY, "1");
}

export function isViewingSiteAsAdmin(): boolean {
  return sessionStorage.getItem(KEY) === "1";
}
