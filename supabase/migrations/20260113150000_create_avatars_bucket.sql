-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Create policy for public access to avatars
CREATE POLICY "Public Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );
