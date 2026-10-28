import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { CreateForm } from "@/components/CreateForm";
import { TopBar } from "@/components/TopBar";

export default async function CreatePage() {
  const user = await currentUser();
  if (!user) redirect("/");

  return (
    <>
      <TopBar user={user} />
      <main className="feed">
        <div style={{ padding: "4px 16px 0" }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>Make a comic</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Four panels, drawn from your idea, with a gem hidden in the story.
          </p>
        </div>
        <CreateForm />
      </main>
    </>
  );
}
