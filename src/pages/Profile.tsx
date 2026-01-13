import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      if (data) {
        setName(data.name || '');
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    // Update email if changed
    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        toast.error('Erro ao atualizar e-mail: ' + emailError.message);
        setLoading(false);
        return;
      }
      toast.info('E-mail de confirmação enviado para o novo endereço.');
    }

    // Upload new avatar if selected
    let newAvatarUrl = avatarUrl;
    if (avatarFile) {
      setUploading(true);
      const filePath = `${user.id}/${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });
      
      if (uploadError) {
        toast.error('Erro ao enviar avatar: ' + uploadError.message);
        setUploading(false);
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      newAvatarUrl = publicUrl;
      setUploading(false);
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, name, avatar_url: newAvatarUrl, email }, { onConflict: 'user_id' });

    if (profileError) {
      toast.error('Erro ao atualizar perfil: ' + profileError.message);
    }
    else {
      toast.success('Perfil atualizado com sucesso!');
      if (newAvatarUrl !== avatarUrl) {
        setAvatarUrl(newAvatarUrl); 
        // Force refresh of AppLayout to show new avatar - not ideal but works for now
        window.location.reload();
      }
    }

    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas informações de perfil
          </p>
        </div>
        <Card className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu e-mail e foto de perfil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-3xl">
                    {name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatar-upload" className="flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    <span>{uploading ? 'Enviando...' : 'Mudar foto'}</span>
                  </Label>
                  <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading}/>
                  <p className="text-xs text-muted-foreground mt-2">JPG ou PNG. Tamanho máximo de 2MB.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <p className="text-lg font-medium">{name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
