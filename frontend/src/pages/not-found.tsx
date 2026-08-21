import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20 mb-4">404</p>
      <h1 className="text-xl font-semibold mb-2" data-testid="text-not-found">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button data-testid="button-go-home">
          <Home className="w-4 h-4 mr-1.5" />
          Go to Dashboard
        </Button>
      </Link>
    </div>
  );
}
