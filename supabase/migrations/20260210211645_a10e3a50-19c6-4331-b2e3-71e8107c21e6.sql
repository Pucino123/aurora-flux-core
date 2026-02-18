-- Enable replica identity FULL so DELETE events include the row data in realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.folders REPLICA IDENTITY FULL;
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.schedule_blocks REPLICA IDENTITY FULL;