import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Every club section needs an account an Admin+ has approved; others wait on the sign-in page. */
export const Route = createFileRoute("/_authenticated/_approved")({
  beforeLoad: async ({ context }) => {
    const { data: approved } = await supabase.rpc("is_approved_member", { _user_id: context.user.id });
    if (!approved) throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});
