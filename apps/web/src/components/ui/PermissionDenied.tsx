import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function PermissionDenied() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="This view is not available for your role"
      description="Your account does not have permission to open this record. Ask the Headmaster if you need access."
      action={
        <Button asChild variant="secondary">
          <Link href="/console/dashboard">Back to overview</Link>
        </Button>
      }
      className="mt-8"
    />
  );
}
