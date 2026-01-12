import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Star, Upload, X, Loader2, Search } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface MemberMention {
  memberId: string;
  feedback: string;
}

export default function NewReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Form state
  const [eventDate, setEventDate] = useState('');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [boxRating, setBoxRating] = useState(0);
  const [teamDescription, setTeamDescription] = useState('');
  const [eventPhotos, setEventPhotos] = useState<File[]>([]);
  const [workshopPhotos, setWorkshopPhotos] = useState<File[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberFeedbacks, setMemberFeedbacks] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      // First get the current user's profile to find their email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('members')
        .select('id, name, avatar_url, email')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      
      // Filter out the current user from the members list
      const filteredMembers = (data || []).filter(
        (member) => member.email !== profile?.email
      );
      
      setMembers(filteredMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handlePhotoUpload = (files: FileList | null, type: 'event' | 'workshop') => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (type === 'event') {
      setEventPhotos((prev) => [...prev, ...fileArray]);
    } else {
      setWorkshopPhotos((prev) => [...prev, ...fileArray]);
    }
  };

  const removePhoto = (index: number, type: 'event' | 'workshop') => {
    if (type === 'event') {
      setEventPhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setWorkshopPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const uploadPhotos = async (files: File[], reportId: string, type: 'event' | 'workshop') => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${reportId}/${type}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('report-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('report-photos')
        .getPublicUrl(fileName);

      return {
        report_id: reportId,
        photo_url: urlData.publicUrl,
        photo_type: type,
      };
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventDate || !birthdayPersonName || boxRating === 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Create report
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          event_date: eventDate,
          birthday_person_name: birthdayPersonName,
          box_rating: boxRating,
          team_description: teamDescription || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload photos
      const allPhotos: any[] = [];

      if (eventPhotos.length > 0) {
        const eventPhotoRecords = await uploadPhotos(eventPhotos, report.id, 'event');
        allPhotos.push(...eventPhotoRecords);
      }

      if (workshopPhotos.length > 0) {
        const workshopPhotoRecords = await uploadPhotos(workshopPhotos, report.id, 'workshop');
        allPhotos.push(...workshopPhotoRecords);
      }

      if (allPhotos.length > 0) {
        const { error: photosError } = await supabase
          .from('report_photos')
          .insert(allPhotos);

        if (photosError) throw photosError;
      }

      // Add member mentions with feedback
      const mentions = selectedMembers
        .filter((memberId) => memberFeedbacks[memberId]?.trim())
        .map((memberId) => ({
          report_id: report.id,
          member_id: memberId,
          feedback: memberFeedbacks[memberId].trim(),
        }));

      if (mentions.length > 0) {
        const { error: mentionsError } = await supabase
          .from('report_member_mentions')
          .insert(mentions);

        if (mentionsError) throw mentionsError;
      }

      toast.success('Relatório criado com sucesso!');
      navigate('/reports');
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('Erro ao criar relatório');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Novo Relatório</h1>
          <p className="text-muted-foreground mt-1">
            Preencha as informações do evento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento</CardTitle>
              <CardDescription>Dados básicos da festa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Data do Evento *</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdayPerson">Nome do Aniversariante *</Label>
                  <Input
                    id="birthdayPerson"
                    placeholder="Ex: Maria Silva"
                    value={birthdayPersonName}
                    onChange={(e) => setBirthdayPersonName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Avaliação da Caixa *</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setBoxRating(rating)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${
                          rating <= boxRating
                            ? 'text-sun fill-sun'
                            : 'text-muted hover:text-sun/50'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    {boxRating > 0 ? `${boxRating}/5` : 'Selecione'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Card */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>Adicione fotos do evento e oficina</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Photos */}
              <div className="space-y-3">
                <Label>Fotos do Evento</Label>
                <div className="flex flex-wrap gap-3">
                  {eventPhotos.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Event ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index, 'event')}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e.target.files, 'event')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Workshop Photos */}
              <div className="space-y-3">
                <Label>Fotos de Oficina (opcional)</Label>
                <div className="flex flex-wrap gap-3">
                  {workshopPhotos.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Workshop ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index, 'workshop')}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-24 w-24 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e.target.files, 'workshop')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Feedback Card */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback da Equipe</CardTitle>
              <CardDescription>
                Descreva como a equipe se saiu e mencione os membros
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamDescription">Descrição Geral</Label>
                <Textarea
                  id="teamDescription"
                  placeholder="Descreva como foi o desempenho da equipe no evento..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {members.length > 0 && (
                <div className="space-y-3">
                  <Label>Mencionar Membros (com feedback individual)</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar membro..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 max-h-80 overflow-y-auto">
                    {members
                      .filter((member) =>
                        member.name.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((member) => (
                        <div
                          key={member.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            selectedMembers.includes(member.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedMembers.includes(member.id)}
                              onCheckedChange={() => toggleMemberSelection(member.id)}
                            />
                            <label
                              htmlFor={`member-${member.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {member.name}
                            </label>
                          </div>
                          {selectedMembers.includes(member.id) && (
                            <Textarea
                              placeholder={`Feedback para ${member.name}...`}
                              value={memberFeedbacks[member.id] || ''}
                              onChange={(e) =>
                                setMemberFeedbacks((prev) => ({
                                  ...prev,
                                  [member.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              className="text-sm"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  {members.filter((member) =>
                    member.name.toLowerCase().includes(memberSearch.toLowerCase())
                  ).length === 0 && memberSearch && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum membro encontrado
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/reports')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar Relatório'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
