export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Welcome to Autoprovider
          </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Your project is ready. Start building by editing this page.
        </p>
      </main>
    </div>
  );
}
