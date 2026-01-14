import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/reports');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Por favor, informe seu email');
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast.error('Erro ao enviar email de recuperação');
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setResetDialogOpen(false);
        setResetEmail('');
      }
    } catch (error) {
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center">
              <img 
                src={logo} 
                alt="Sol e Lua Animação" 
                className="h-28 w-auto animate-float"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Bem-vindo!
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
            
            <div className="text-center">
              <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="link" className="text-primary hover:text-primary/80">
                    Esqueci minha senha
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Recuperar Senha</DialogTitle>
                    <DialogDescription>
                      Digite seu email para receber um link de recuperação de senha.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isResetting}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isResetting}
                    >
                      {isResetting ? 'Enviando...' : 'Enviar link de recuperação'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-primary-foreground/70 text-sm mt-6">
          Animação Sol e Lua
        </p>
      </div>
    </div>
  );
}