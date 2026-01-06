import { AkiraShell } from "@/components/akira-shell";
import { SessionProvider } from "@/components/session-provider";
import { SwrProvider } from "@/components/swr-provider";
import {
  fetchCardsFromDb,
  fetchFriendsFromDb,
  fetchSessionUserFromDb,
} from "@/server/data-loader";

export default async function HomePage() {
  const sessionUser = await fetchSessionUserFromDb();
  const [cards, friends] = await Promise.all([
    fetchCardsFromDb(),
    fetchFriendsFromDb(sessionUser?.id),
  ]);

  const friendsKey = sessionUser?.id
    ? `/api/friends?viewerId=${sessionUser.id}`
    : "/api/friends";

  return (
    <SwrProvider fallback={{ [friendsKey]: friends }}>
      <SessionProvider initialUser={sessionUser}>
        <AkiraShell cards={cards} />
      </SessionProvider>
    </SwrProvider>
  );
}
