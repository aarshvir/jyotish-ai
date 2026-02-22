import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user?.id)
    .single();

  const { data: birthCharts } = await supabase
    .from('birth_charts')
    .select('*, reports(count)')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  const { data: reports } = await supabase
    .from('reports')
    .select('*, birth_charts(name)')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {userProfile?.name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Plan: <Badge variant="outline">{userProfile?.plan || 'free'}</Badge> • 
              Reports this month: {userProfile?.reports_used_this_month || 0}
            </p>
          </div>
          <Link href="/onboarding">
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Birth Charts</h2>
          {birthCharts && birthCharts.length > 0 ? (
            <div className="space-y-4">
              {birthCharts.map((chart) => (
                <Card key={chart.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{chart.name}</CardTitle>
                    <CardDescription>
                      {new Date(chart.birth_date).toLocaleDateString()} at {chart.birth_time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📍 {chart.birth_city}</p>
                      {chart.lagna && <p>Lagna: {chart.lagna}</p>}
                      {chart.moon_sign && <p>Moon: {chart.moon_sign}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">No birth charts yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Reports</h2>
          {reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {report.report_type}
                        </CardTitle>
                        <CardDescription>
                          {new Date(report.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={
                        report.status === 'completed' ? 'default' :
                        report.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/report/${report.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        View Report
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You haven&apos;t generated any reports yet
                </p>
                <Link href="/onboarding">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Generate Your First Report
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
