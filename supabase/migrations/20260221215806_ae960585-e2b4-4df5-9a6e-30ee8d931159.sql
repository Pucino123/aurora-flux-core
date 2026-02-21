
-- Fix folders RLS policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can insert own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;

CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Fix documents RLS policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Fix tasks RLS policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Fix goals RLS policies
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- Fix schedule_blocks RLS policies
DROP POLICY IF EXISTS "Users can view own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can insert own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can update own schedule" ON public.schedule_blocks;
DROP POLICY IF EXISTS "Users can delete own schedule" ON public.schedule_blocks;

CREATE POLICY "Users can view own schedule" ON public.schedule_blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule" ON public.schedule_blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule" ON public.schedule_blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule" ON public.schedule_blocks FOR DELETE USING (auth.uid() = user_id);

-- Fix workouts RLS policies
DROP POLICY IF EXISTS "Users can view own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can insert own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can update own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can delete own workouts" ON public.workouts;

CREATE POLICY "Users can view own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Fix profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Fix council tables RLS policies
DROP POLICY IF EXISTS "Users can manage their own council ideas" ON public.council_ideas;
CREATE POLICY "Users can manage their own council ideas" ON public.council_ideas FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own council responses" ON public.council_responses;
CREATE POLICY "Users can manage their own council responses" ON public.council_responses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own council debates" ON public.council_debates;
CREATE POLICY "Users can manage their own council debates" ON public.council_debates FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own council threads" ON public.council_threads;
CREATE POLICY "Users can manage their own council threads" ON public.council_threads FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own decision scores" ON public.council_decision_scores;
CREATE POLICY "Users can manage their own decision scores" ON public.council_decision_scores FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own simulations" ON public.council_simulations;
CREATE POLICY "Users can manage their own simulations" ON public.council_simulations FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own idea versions" ON public.idea_versions;
CREATE POLICY "Users can manage their own idea versions" ON public.idea_versions FOR ALL USING (auth.uid() = user_id);

-- Fix council_sticky_notes
DROP POLICY IF EXISTS "Users can view their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can create their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can update their own sticky notes" ON public.council_sticky_notes;
DROP POLICY IF EXISTS "Users can delete their own sticky notes" ON public.council_sticky_notes;

CREATE POLICY "Users can view their own sticky notes" ON public.council_sticky_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sticky notes" ON public.council_sticky_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sticky notes" ON public.council_sticky_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sticky notes" ON public.council_sticky_notes FOR DELETE USING (auth.uid() = user_id);
