import { signIn } from "@/app/signin/actions";
import { getSignInUsers } from "@/lib/pmo/queries";
import { btnCommit } from "@/components/ui/Button";
import { PulseMark } from "@/components/ui/PulseMark";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const users = getSignInUsers();
  const featured = ["USR001", "USR003", "USR005", "USR024", "USR028"];
  const top = featured
    .map((id) => users.find((u) => u.userId === id))
    .filter((u): u is (typeof users)[number] => Boolean(u));
  const rest = users.filter((u) => !featured.includes(u.userId));

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <PulseMark />
      <h1 className="page-title mt-4">Portfolio Pulse</h1>
      <p className="text-[13px] leading-5 text-[var(--ink-2)]">
        Sign in as a sample user. Access and money follow that person. This is
        not SSO.
      </p>
      <form action={signIn} className="space-y-3">
        <input type="hidden" name="next" value={next || "/"} />
        <label className="block">
          <span className="kicker">User</span>
          <select
            name="userId"
            defaultValue="USR001"
            className="mt-2 w-full rounded-[10px] border border-[var(--tile-border)] bg-[var(--surface)] px-3 py-2.5 text-[15px]"
          >
            <optgroup label="Try these">
              {top.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} · {u.role}
                  {u.canViewFinancials ? "" : " · no money"} · {u.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Everyone else">
              {rest.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} · {u.role} · {u.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button type="submit" className={`${btnCommit} w-full`}>
          Sign in
        </button>
      </form>
    </main>
  );
}
