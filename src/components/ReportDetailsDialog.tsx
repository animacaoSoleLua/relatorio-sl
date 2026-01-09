import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, Calendar, User, Image, MessageSquare, Loader2 } from 'lucide-react';

interface Report {
  id: string;
  event_date: string;
  birthday_person_name: string;
  box_rating: number;
  team_description: string | null;
  created_at: string;
  created_by: string | null;
}

interface ReportPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
}

interface MemberMention {
  id: string;
  feedback: string;
  member: {
    name: string;
  };
}

interface Creator {
  name: string;
  email: string;
}

interface ReportDetailsDialogProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function ReportDetailsDialog({
  report,
  open,
  onOpenChange,
}: ReportDetailsDialogProps) {
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [mentions, setMentions] = useState<MemberMention[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report && open) {
      fetchReportDetails();
    }
  }, [report, open]);

  const fetchReportDetails = async () => {
    if (!report) return;
    
    setLoading(true);
    try {
      // Fetch photos
      const { data: photosData } = await supabase
        .from('report_photos')
        .select('id, photo_url, photo_type')
        .eq('report_id', report.id);

      setPhotos(photosData || []);

      // Fetch member mentions with member info
      const { data: mentionsData } = await supabase
        .from('report_member_mentions')
        .select(`
          id,
          feedback,
          member:members(name)
        `)
        .eq('report_id', report.id);

      setMentions(mentionsData as any || []);

      // Fetch creator info
      if (report.created_by) {
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', report.created_by)
          .maybeSingle();

        setCreator(creatorData);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventPhotos = photos.filter((p) => p.photo_type === 'event');
  const workshopPhotos = photos.filter((p) => p.photo_type === 'workshop');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Detalhes do Evento
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : report ? (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{report.birthday_person_name}</h3>
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatEventDate(report.event_date)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Avaliação da caixa:</span>
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

                {creator && (
                  <div className="text-sm text-muted-foreground">
                    Criado por: <span className="font-medium text-foreground">{creator.name}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Team Description */}
              {report.team_description && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Descrição da Equipe
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {report.team_description}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Member Feedbacks */}
              {mentions.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Feedbacks Individuais ({mentions.length})
                    </h4>
                    <div className="space-y-2">
                      {mentions.map((mention) => (
                        <div
                          key={mention.id}
                          className="p-3 rounded-lg bg-muted/50 space-y-1"
                        >
                          <span className="text-sm font-medium">{mention.member?.name}</span>
                          <p className="text-sm text-muted-foreground">{mention.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Event Photos */}
              {eventPhotos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    Fotos do Evento ({eventPhotos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {eventPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={photo.photo_url}
                          alt="Foto do evento"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Workshop Photos */}
              {workshopPhotos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Image className="h-4 w-4 text-secondary" />
                    Fotos da Oficina ({workshopPhotos.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {workshopPhotos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={photo.photo_url}
                          alt="Foto da oficina"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {photos.length === 0 && mentions.length === 0 && !report.team_description && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum detalhe adicional para este relatório
                </p>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}