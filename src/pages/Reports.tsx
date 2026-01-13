import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Star, Plus, Search, Calendar, User, Trash2 } from 'lucide-react';
import ReportDetailsDialog from '@/components/ReportDetailsDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Report {
  id: string;
  event_date: string;
  birthday_person_name: string;
  box_rating: number;
  team_description: string | null;
  created_at: string;
  created_by: string | null;
  creator_name?: string;
}

// Helper function to format date correctly without timezone issues
function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function Reports() {
  const { userRole } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch creator names for each report
      const reportsWithCreators = await Promise.all(
        (data || []).map(async (report) => {
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
      
      setReports(reportsWithCreators);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) =>
    report.birthday_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (report.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleDeleteClick = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    setDeleting(true);
    try {
      // Delete related records first
      await supabase
        .from('report_member_mentions')
        .delete()
        .eq('report_id', reportToDelete.id);

      await supabase
        .from('report_photos')
        .delete()
        .eq('report_id', reportToDelete.id);

      // Delete the report
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete.id);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== reportToDelete.id));
      toast.success('Relatório excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Erro ao excluir relatório');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">
              Gerenciar relatórios de eventos
            </p>
          </div>
          <Link to="/reports/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Relatório
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por aniversariante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report, index) => (
              <Card 
                key={report.id} 
                className="hover:shadow-card transition-shadow animate-slide-up opacity-0 cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => {
                  setSelectedReport(report);
                  setDialogOpen(true);
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        {report.creator_name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatEventDate(report.event_date)}
                      </CardDescription>
                    </div>
                    {userRole === 'admin' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(e, report)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Avaliação Geral da Equipe</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < report.box_rating
                                ? 'text-sun fill-sun'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {report.team_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.team_description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                Nenhum relatório encontrado
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm
                  ? 'Tente buscar por outro nome'
                  : 'Comece criando seu primeiro relatório de evento'}
              </p>
              {!searchTerm && (
                <Link to="/reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Relatório
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Report Details Dialog */}
        <ReportDetailsDialog
          report={selectedReport}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          isAdmin={userRole === 'admin'}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Relatório</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
                Todas as fotos e feedbacks associados também serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

function FileText(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  );
}
