create policy "No direct browser access to Wellfarm scans"
on public.wellfarm_scans
for all
to anon, authenticated
using (false)
with check (false);
