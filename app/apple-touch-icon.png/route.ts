// Asked for at the root of the platform host, where there is no shop: our own mark.
// On a shop's own domain proxy.ts rewrites this path to app/[slug]/apple-touch-icon.png instead.
import { ICON_SIZES, iconResponse } from '~/lib/storeIcon';

export async function GET() {
  return iconResponse(null, ICON_SIZES.apple);
}
