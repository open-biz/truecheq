import { redirect } from 'next/navigation';

export default function MarketplacePage() {
  redirect('/?tab=buy');
}
