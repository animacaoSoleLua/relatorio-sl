-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'animador');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create members table (team members of Sol e Lua)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table (event reports)
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    birthday_person_name TEXT NOT NULL,
    box_rating INTEGER NOT NULL CHECK (box_rating >= 1 AND box_rating <= 5),
    team_description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_photos table (for event and workshop photos)
CREATE TABLE public.report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    photo_url TEXT NOT NULL,
    photo_type TEXT NOT NULL CHECK (photo_type IN ('event', 'workshop')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_member_mentions table (for feedback mentions)
CREATE TABLE public.report_member_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    feedback TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_member_mentions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- User roles policies (only viewable by the user themselves)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Members policies (all authenticated users can view)
CREATE POLICY "Authenticated users can view members"
ON public.members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert members"
ON public.members FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update members"
ON public.members FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete members"
ON public.members FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Reports policies
CREATE POLICY "Authenticated users can view reports"
ON public.reports FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own reports"
ON public.reports FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Report photos policies
CREATE POLICY "Authenticated users can view report photos"
ON public.report_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert report photos"
ON public.report_photos FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.reports WHERE id = report_id AND created_by = auth.uid()
));

-- Report member mentions policies
CREATE POLICY "Admins can view all mentions"
ON public.report_member_mentions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert mentions"
ON public.report_member_mentions FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.reports WHERE id = report_id AND created_by = auth.uid()
));

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view report photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-photos');

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();