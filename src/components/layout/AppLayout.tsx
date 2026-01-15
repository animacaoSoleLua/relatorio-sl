import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  UserCog,
  Menu, 
  LogOut,
  User,
  PlusCircle
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: true },
  { name: 'Relatórios', href: '/reports', icon: FileText, adminOnly: false },
  { name: 'Novo Relatório', href: '/reports/new', icon: PlusCircle, adminOnly: false },
  { name: 'Membros', href: '/members', icon: Users, adminOnly: false },
  { name: 'Usuários', href: '/users', icon: UserCog, adminOnly: true },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, userRole, userProfile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const avatarFallback = userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(
    (item) => !item.adminOnly || userRole === 'admin'
  );

  const NavLinks = () => (
    <>
      {filteredNavigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 lg:hidden bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex flex-col h-full">
                <Link to="/reports" className="flex items-center justify-center p-6 border-b border-border">
                  <img src={logo} alt="Sol e Lua" className="h-16 w-auto" />
                </Link>
                <nav className="flex-1 p-4 space-y-2">
                  <NavLinks />
                </nav>
              </div>
          </SheetContent>
          </Sheet>
          
          <Link to="/reports">
            <img src={logo} alt="Sol e Lua" className="h-10 w-auto" />
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
          <Link to="/reports" className="flex items-center justify-center p-6 border-b border-border">
            <img src={logo} alt="Sol e Lua" className="h-20 w-auto" />
          </Link>
          
          <nav className="flex-1 p-4 space-y-2">
            <NavLinks />
          </nav>
          
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-sm font-medium truncate max-w-[140px]">
                      {userProfile?.name || user?.email}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:pl-64">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
