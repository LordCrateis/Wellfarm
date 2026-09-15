create view public.wellfarm_conversation_summaries
with (security_invoker = true)
as
select
  account_id,
  count(*)::bigint as message_count,
  max(created_at) as latest_message_at,
  count(*) filter (where sender_id = account_id)::bigint as farmer_message_count,
  max(created_at) filter (where sender_id = account_id) as latest_farmer_message_at
from public.wellfarm_messages
group by account_id;

revoke all on table public.wellfarm_conversation_summaries from public, anon, authenticated;
grant select on table public.wellfarm_conversation_summaries to service_role;

comment on view public.wellfarm_conversation_summaries is
  'Server-only summary used to order farmer conversations for Wellfarm administrators.';
