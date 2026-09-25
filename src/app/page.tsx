import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Basecamp Pass</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        A home base in Japan for travelers and working-holiday makers. Leave your luggage, travel,
        come back. Friends can join — but only people you invited and who proved who they are.
      </p>
      <Link href="/host" className="rounded-xl bg-black px-5 py-4 text-center text-lg font-semibold text-white dark:bg-white dark:text-black">
        I&apos;m the host
      </Link>
    </main>
  );
}
