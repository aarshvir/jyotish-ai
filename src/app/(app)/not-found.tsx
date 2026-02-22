import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
