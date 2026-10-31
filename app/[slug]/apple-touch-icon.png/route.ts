// The shop's icon on a fixed URL, drawn from its logo — see lib/storeIcon.ts.
import { ICON_SIZES, iconResponse } from '~/lib/storeIcon';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return iconResponse(slug, ICON_SIZES.apple);
}
