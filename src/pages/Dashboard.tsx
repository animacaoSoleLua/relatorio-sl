import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Star, Calendar, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import AppLayout from '@/components/layout/AppLayout';
import ReportDetailsDialog from '@/components/ReportDetailsDialog';

interface DashboardStats {
  totalReports: number;
  averageRating: number;
  reportsThisMonth: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    averageRating: 0,
    reportsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total reports
      const { count: totalReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      // Fetch average rating
      const { data: ratingData } = await supabase
        .from('reports')
        .select('box_rating');

      const averageRating = ratingData && ratingData.length > 0
        ? ratingData.reduce((acc, r) => acc + r.box_rating, 0) / ratingData.length
        : 0;

      // Fetch reports this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: reportsThisMonth } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Fetch recent reports with creator info
      const { data: recent } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch creator names for each report
      const reportsWithCreators = await Promise.all(
        (recent || []).map(async (report) => {
          if (report.created_by) {
            const { data: creator } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', report.created_by)
              .maybeSingle();
            return { ...report, creator_name: creator?.name || 'Usuário' };
          }
          return { ...report, creator_name: 'Usuário' };
        })
      );

      setStats({
        totalReports: totalReports || 0,
        averageRating: Math.round(averageRating * 10) / 10,
        reportsThisMonth: reportsThisMonth || 0,
      });

      setRecentReports(reportsWithCreators);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Relatórios',
      value: stats.totalReports,
      icon: FileText,
      description: 'Relatórios cadastrados',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Avaliação Média da Equipe',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'text-sun',
      bgColor: 'bg-sun/20',
    },
    {
      title: 'Relatórios do Mês',
      value: stats.reportsThisMonth,
      icon: Calendar,
      description: 'Eventos realizados',
      color: 'text-purple-glow',
      bgColor: 'bg-purple-light',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <Card 
              key={card.title} 
              className={`animate-slide-up opacity-0 stagger-${index + 1}`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{loading ? '...' : card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Relatórios Recentes</CardTitle>
              <CardDescription>Últimos eventos cadastrados no sistema</CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={() => setViewMode('list')}
                size="sm"
                aria-label="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={() => setViewMode('grid')}
                size="sm"
                aria-label="Visualização em grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Toggle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : recentReports.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
                {recentReports.map((report) => {
                  const [year, month, day] = report.event_date.split('-').map(Number);
                  const eventDate = new Date(year, month - 1, day);
                  
                  return (
                    <div
                      key={report.id}
                      onClick={() => {
                        setSelectedReport(report);
                        setDialogOpen(true);
                      }}
                      className={`flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'flex-col items-start gap-3' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{report.creator_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {eventDate.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < report.box_rating
                                ? 'text-sun fill-sun'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum relatório cadastrado ainda
              </p>
            )}
          </CardContent>
        </Card>

        <ReportDetailsDialog
          report={selectedReport}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </div>
    </AppLayout>
  );
}
