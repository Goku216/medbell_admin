import { redirect } from "next/navigation";

import { PARTNER_LOGIN_PATH } from "@/lib/constants";

/**
 * The partner sign-in moved to the home page. Kept as a redirect so bookmarks
 * and anything already sent to partners still lands in the right place.
 */
export default function PartnerLoginRedirect() {
  redirect(PARTNER_LOGIN_PATH);
}
