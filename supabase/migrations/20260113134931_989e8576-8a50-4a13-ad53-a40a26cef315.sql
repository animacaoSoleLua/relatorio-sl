-- Add new columns to reports table
ALTER TABLE public.reports 
ADD COLUMN title_schedule text,
ADD COLUMN transportation_type text DEFAULT 'uber',
ADD COLUMN transportation_other_details text,
ADD COLUMN uber_cost_going numeric(10,2) DEFAULT 0,
ADD COLUMN uber_cost_return numeric(10,2) DEFAULT 0,
ADD COLUMN outside_brasilia boolean DEFAULT false,
ADD COLUMN extra_hours boolean DEFAULT false,
ADD COLUMN exclusivity boolean DEFAULT false,
ADD COLUMN event_description text,
ADD COLUMN event_difficulty integer DEFAULT 3,
ADD COLUMN event_quality integer DEFAULT 3,
ADD COLUMN difficulties_problems text,
ADD COLUMN speaker_quality integer DEFAULT 3,
ADD COLUMN microphone_quality integer DEFAULT 3,
ADD COLUMN speaker_number integer,
ADD COLUMN electronics_observations text;

-- Add check constraints for ratings
ALTER TABLE public.reports 
ADD CONSTRAINT reports_event_difficulty_check CHECK (event_difficulty >= 1 AND event_difficulty <= 5),
ADD CONSTRAINT reports_event_quality_check CHECK (event_quality >= 1 AND event_quality <= 5),
ADD CONSTRAINT reports_speaker_quality_check CHECK (speaker_quality >= 1 AND speaker_quality <= 5),
ADD CONSTRAINT reports_microphone_quality_check CHECK (microphone_quality >= 1 AND microphone_quality <= 5),
ADD CONSTRAINT reports_speaker_number_check CHECK (speaker_number >= 1 AND speaker_number <= 19);