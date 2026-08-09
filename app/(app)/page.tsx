import { redirect } from "next/navigation";
import { getDefaultWorkspace } from "@/lib/workspace";
import { EmptyState } from "@/components/ui";

/** "/" is not a page — it hands off to the first workspace. */
export default async function RootPage() {
  const workspace = await getDefaultWorkspace();

  if (!workspace) {
    return (
      <EmptyState
        title="No workspaces configured"
        description="Add a row to the workspaces table to get started."
      />
    );
  }

  redirect(`/${workspace.slug}`);
}
