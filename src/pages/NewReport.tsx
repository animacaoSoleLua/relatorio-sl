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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

interface PhotoCategory {
  key: string;
  label: string;
  files: File[];
}

export default function NewReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Basic Info
  const [eventDate, setEventDate] = useState('');
  const [titleSchedule, setTitleSchedule] = useState('');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  
  // Transportation
  const [transportationType, setTransportationType] = useState('uber');
  const [transportationOtherDetails, setTransportationOtherDetails] = useState('');
  const [uberCostGoing, setUberCostGoing] = useState('');
  const [uberCostReturn, setUberCostReturn] = useState('');
  
  // Event Flags
  const [outsideBrasilia, setOutsideBrasilia] = useState(false);
  const [extraHours, setExtraHours] = useState(false);
  const [exclusivity, setExclusivity] = useState(false);
  
  // Team Feedback
  const [teamDescription, setTeamDescription] = useState('');
  const [boxRating, setBoxRating] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberFeedbacks, setMemberFeedbacks] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState('');
  
  // Event Description
  const [eventDescription, setEventDescription] = useState('');
  const [eventDifficulty, setEventDifficulty] = useState(0);
  const [eventQuality, setEventQuality] = useState(0);
  const [difficultiesProblems, setDifficultiesProblems] = useState('');
  
  // Electronics
  const [speakerQuality, setSpeakerQuality] = useState(0);
  const [microphoneQuality, setMicrophoneQuality] = useState(0);
  const [speakerNumber, setSpeakerNumber] = useState('');
  const [electronicsObservations, setElectronicsObservations] = useState('');
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);
  
  // Photo categories
  const [paintingPhotos, setPaintingPhotos] = useState<File[]>([]);
  const [balloonPhotos, setBalloonPhotos] = useState<File[]>([]);
  const [animationPhotos, setAnimationPhotos] = useState<File[]>([]);
  const [charactersPhotos, setCharactersPhotos] = useState<File[]>([]);
  const [workshopPhotos, setWorkshopPhotos] = useState<File[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
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
      
      const filteredMembers = (data || []).filter(
        (member) => member.email !== profile?.email
      );
      
      setMembers(filteredMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handlePhotoUpload = (
    files: FileList | null, 
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setter((prev) => [...prev, ...fileArray]);
  };

  const removePhoto = (
    index: number, 
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const uploadPhotos = async (files: File[], reportId: string, type: string) => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${reportId}/${type}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
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
      // Create report with all new fields
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          event_date: eventDate,
          title_schedule: titleSchedule || null,
          birthday_person_name: birthdayPersonName,
          transportation_type: transportationType,
          transportation_other_details: transportationType === 'outro' ? transportationOtherDetails : null,
          uber_cost_going: uberCostGoing ? parseFloat(uberCostGoing.replace(',', '.')) : 0,
          uber_cost_return: uberCostReturn ? parseFloat(uberCostReturn.replace(',', '.')) : 0,
          outside_brasilia: outsideBrasilia,
          extra_hours: extraHours,
          exclusivity: exclusivity,
          team_description: teamDescription || null,
          box_rating: boxRating,
          event_description: eventDescription || null,
          event_difficulty: eventDifficulty,
          event_quality: eventQuality,
          difficulties_problems: difficultiesProblems || null,
          speaker_quality: speakerQuality,
          microphone_quality: microphoneQuality,
          speaker_number: speakerNumber ? parseInt(speakerNumber) : null,
          electronics_observations: electronicsObservations || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Upload all photo categories
      const allPhotos: any[] = [];
      
      const photoCategories = [
        { files: paintingPhotos, type: 'painting' },
        { files: balloonPhotos, type: 'balloon' },
        { files: animationPhotos, type: 'animation' },
        { files: charactersPhotos, type: 'characters' },
        { files: workshopPhotos, type: 'workshop' },
        { files: damagePhotos, type: 'damage' },
      ];

      for (const category of photoCategories) {
        if (category.files.length > 0) {
          const photoRecords = await uploadPhotos(category.files, report.id, category.type);
          allPhotos.push(...photoRecords);
        }
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

  const renderStarRating = (
    value: number, 
    onChange: (v: number) => void, 
    label: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                rating <= value
                  ? 'text-sun fill-sun'
                  : 'text-muted hover:text-sun/50'
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {value > 0 ? `${value}/5` : 'Selecione'}
        </span>
      </div>
    </div>
  );

  const renderPhotoUploader = (
    label: string,
    photos: File[],
    setPhotos: React.Dispatch<React.SetStateAction<File[]>>,
    optional: boolean = true
  ) => (
    <div className="space-y-3">
      <Label>{label} {optional && <span className="text-muted-foreground">(Caso tenha)</span>}</Label>
      <div className="flex flex-wrap gap-3">
        {photos.map((file, index) => (
          <div key={index} className="relative group">
            <img
              src={URL.createObjectURL(file)}
              alt={`${label} ${index + 1}`}
              className="h-20 w-20 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => removePhoto(index, setPhotos)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="h-20 w-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePhotoUpload(e.target.files, setPhotos)}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );

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
                  <Label htmlFor="eventDate">Data do Evento (Obrigatório)</Label>
                  <Input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleSchedule">Título/Cronograma</Label>
                  <Input
                    id="titleSchedule"
                    placeholder="Colocar titulo que aparece na agenda"
                    value={titleSchedule}
                    onChange={(e) => setTitleSchedule(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthdayPerson">Aniversariante / Contratante (Obrigatório)</Label>
                <Input
                  id="birthdayPerson"
                  placeholder="Nome do aniversariante, contratante ou empresa"
                  value={birthdayPersonName}
                  onChange={(e) => setBirthdayPersonName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Transportation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Locomoção</CardTitle>
              <CardDescription>Informações sobre transporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Forma de Locomoção</Label>
                <Select value={transportationType} onValueChange={setTransportationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uber">Uber/99</SelectItem>
                    <SelectItem value="carro_empresa">Carro da Empresa</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transportationType === 'outro' && (
                <div className="space-y-2">
                  <Label htmlFor="otherDetails">Especifique (responsável pelo carro)</Label>
                  <Input
                    id="otherDetails"
                    placeholder="Ex: Anarq foi com carro próprio"
                    value={transportationOtherDetails}
                    onChange={(e) => setTransportationOtherDetails(e.target.value)}
                  />
                </div>
              )}

              {transportationType === 'uber' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="uberGoing">Valor Uber (ida)</Label>
                    <Input
                      id="uberGoing"
                      placeholder="Ex: 25,50"
                      value={uberCostGoing}
                      onChange={(e) => setUberCostGoing(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Some valores de múltiplos Ubers se houver
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uberReturn">Valor Uber (volta)</Label>
                    <Input
                      id="uberReturn"
                      placeholder="Ex: 30,00"
                      value={uberCostReturn}
                      onChange={(e) => setUberCostReturn(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label htmlFor="outsideBrasilia" className="cursor-pointer">
                    Fora de Brasília?
                  </Label>
                  <Switch
                    id="outsideBrasilia"
                    checked={outsideBrasilia}
                    onCheckedChange={setOutsideBrasilia}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label htmlFor="extraHours" className="cursor-pointer">
                    Hora Extra?
                  </Label>
                  <Switch
                    id="extraHours"
                    checked={extraHours}
                    onCheckedChange={setExtraHours}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <Label htmlFor="exclusivity" className="cursor-pointer">
                    Exclusividade?
                  </Label>
                  <Switch
                    id="exclusivity"
                    checked={exclusivity}
                    onCheckedChange={setExclusivity}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Feedback Card */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback da Equipe</CardTitle>
              <CardDescription>
                Avaliação e comentários sobre a equipe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamDescription">Descrição Geral da Equipe</Label>
                <Textarea
                  id="teamDescription"
                  placeholder="Descreva como foi o desempenho da equipe no evento em geral..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {renderStarRating(boxRating, setBoxRating, "Avaliação Geral da Equipe (Obrigatório)")}

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
                  {memberSearch && (
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
                      {members.filter((member) =>
                        member.name.toLowerCase().includes(memberSearch.toLowerCase())
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 col-span-full">
                          Nenhum membro encontrado
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Description Card */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição do Evento</CardTitle>
              <CardDescription>Detalhes sobre a festa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficultiesProblems">Dificuldades e Problemas</Label>
                <Textarea
                  id="difficultiesProblems"
                  placeholder="Relate dificuldades ou problemas encontrados..."
                  value={difficultiesProblems}
                  onChange={(e) => setDifficultiesProblems(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {renderStarRating(eventDifficulty, setEventDifficulty, "Dificuldade do Evento")}
                {renderStarRating(eventQuality, setEventQuality, "Qualidade do Evento")}
              </div>
            </CardContent>
          </Card>

          {/* Electronics Card */}
          <Card>
            <CardHeader>
              <CardTitle>Eletrônicos</CardTitle>
              <CardDescription>Avaliação dos equipamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {renderStarRating(speakerQuality, setSpeakerQuality, "Qualidade da Caixa de Som")}
                {renderStarRating(microphoneQuality, setMicrophoneQuality, "Qualidade do Microfone")}
              </div>

              <div className="space-y-2">
                <Label htmlFor="speakerNumber">Número da Caixa (1-19)</Label>
                <Input
                  id="speakerNumber"
                  type="number"
                  min="1"
                  max="19"
                  placeholder="Ex: 5"
                  value={speakerNumber}
                  onChange={(e) => setSpeakerNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="electronicsObservations">Observações</Label>
                <Textarea
                  id="electronicsObservations"
                  placeholder="Observações sobre os equipamentos..."
                  value={electronicsObservations}
                  onChange={(e) => setElectronicsObservations(e.target.value)}
                  rows={3}
                />
              </div>

              {renderPhotoUploader(
                "Fotos de Avarias",
                damagePhotos,
                setDamagePhotos
              )}
            </CardContent>
          </Card>

          {/* Photos Card */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos/Arquivos do Evento</CardTitle>
              <CardDescription>Adicione fotos por categoria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderPhotoUploader("Pintura", paintingPhotos, setPaintingPhotos)}
              {renderPhotoUploader("Balão", balloonPhotos, setBalloonPhotos)}
              {renderPhotoUploader("Animação", animationPhotos, setAnimationPhotos)}
              {renderPhotoUploader("Personagens", charactersPhotos, setCharactersPhotos)}
              {renderPhotoUploader("Oficina", workshopPhotos, setWorkshopPhotos)}
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
