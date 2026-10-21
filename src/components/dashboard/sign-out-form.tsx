import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/auth/actions";

export function SignOutForm({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant={inverted ? "dark" : compact ? "ghost" : "outline"}
        size="sm"
      >
        <LogOut />
        Esci
      </Button>
    </form>
  );
}
