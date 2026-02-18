-- Create Council Tables

-- council_ideas table
CREATE TABLE IF NOT EXISTS public.council_ideas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    consensus_score INTEGER,
    starred BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- council_responses table
CREATE TABLE IF NOT EXISTS public.council_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES public.council_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    persona_key TEXT NOT NULL,
    analysis TEXT,
    vote TEXT,
    vote_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- council_threads table
CREATE TABLE IF NOT EXISTS public.council_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    response_id UUID REFERENCES public.council_responses(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    persona_key TEXT NOT NULL,
    user_message TEXT NOT NULL,
    persona_reply TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- council_debates table
CREATE TABLE IF NOT EXISTS public.council_debates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES public.council_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    round INTEGER NOT NULL,
    challenger_key TEXT NOT NULL,
    defender_key TEXT NOT NULL,
    challenger_argument TEXT,
    defender_counter TEXT,
    winner_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- council_decision_scores table
CREATE TABLE IF NOT EXISTS public.council_decision_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES public.council_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    consensus_pct INTEGER,
    risk_score INTEGER,
    innovation_score INTEGER,
    execution_difficulty INTEGER,
    long_term_potential INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- idea_versions table
CREATE TABLE IF NOT EXISTS public.idea_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES public.council_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    change_summary TEXT,
    influenced_by TEXT,
    consensus_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- council_simulations table
CREATE TABLE IF NOT EXISTS public.council_simulations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    idea_id UUID NOT NULL REFERENCES public.council_ideas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    scenario_type TEXT NOT NULL,
    scenario_description TEXT,
    risk_probability INTEGER,
    time_to_execution TEXT,
    required_resources TEXT,
    failure_points TEXT,
    persona_reactions JSONB,
    consensus_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.council_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_decision_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified for single user access for now, can be expanded)
CREATE POLICY "Users can manage their own council ideas" ON public.council_ideas
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own council responses" ON public.council_responses
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own council threads" ON public.council_threads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own council debates" ON public.council_debates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own decision scores" ON public.council_decision_scores
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own idea versions" ON public.idea_versions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own simulations" ON public.council_simulations
    FOR ALL USING (auth.uid() = user_id);
