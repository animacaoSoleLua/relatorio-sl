import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Search, Mail, MessageSquare, User } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  active: boolean;
}

interface MemberFeedback {
  id: string;
  feedback: string;
  created_at: string;
  report: {
    birthday_person_name: string;
    event_date: string;
  };
}

export default function Members() {
  const { userRole } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberFeedbacks, setMemberFeedbacks] = useState<MemberFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberFeedbacks = async (memberId: string) => {
    if (userRole !== 'admin') return;
    
    setLoadingFeedbacks(true);
    try {
      const { data, error } = await supabase
        .from('report_member_mentions')
        .select(`
          id,
          feedback,
          created_at,
          report:reports(birthday_person_name, event_date)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemberFeedbacks(data as any || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSavingMember(true);

    try {
      const { error } = await supabase.from('members').insert({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
      });

      if (error) throw error;

      toast.success('Membro adicionado com sucesso!');
      setNewMemberName('');
      setNewMemberEmail('');
      setIsDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe um membro com esse email');
      } else {
        toast.error('Erro ao adicionar membro');
      }
    } finally {
      setSavingMember(false);
    }
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    if (userRole === 'admin') {
      fetchMemberFeedbacks(member.id);
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Membros</h1>
            <p className="text-muted-foreground mt-1">
              Equipe Sol e Lua Animação
            </p>
          </div>
          {userRole === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Membro</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo membro da equipe
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Nome completo"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={savingMember} className="flex-1">
                      {savingMember ? 'Salvando...' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Members List */}
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-all hover:shadow-card animate-slide-up opacity-0 ${
                    selectedMember?.id === member.id ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleMemberClick(member)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{member.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        {member.email}
                      </p>
                    </div>
                    {!member.active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        Inativo
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Nenhum membro encontrado
                  </h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm
                      ? 'Tente buscar por outro termo'
                      : 'Adicione membros da equipe'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Member Details */}
          <div className="lg:sticky lg:top-4 h-fit">
            {selectedMember ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedMember.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedMember.name}</CardTitle>
                      <CardDescription>{selectedMember.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {userRole === 'admin' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>Feedbacks recebidos</span>
                      </div>
                      {loadingFeedbacks ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                          ))}
                        </div>
                      ) : memberFeedbacks.length > 0 ? (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {memberFeedbacks.map((feedback) => (
                            <div
                              key={feedback.id}
                              className="p-3 rounded-lg bg-muted/50 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Evento: {feedback.report.birthday_person_name}</span>
                                <span>
                                  {new Date(feedback.report.event_date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-sm">{feedback.feedback}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum feedback registrado
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Informações do membro
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Selecione um membro para ver detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
