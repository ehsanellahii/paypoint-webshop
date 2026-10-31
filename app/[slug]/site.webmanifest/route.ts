// The shop's web app manifest — name and icons, see lib/storeIcon.ts.
import { getStoreBase } from '~/lib/storeBase';
import { manifestResponse } from '~/lib/storeIcon';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return manifestResponse(slug, await getStoreBase(slug));
}
