insert into public.privacy_policy_versions (consent_type, version, is_current)
values ('geolocation_processing', 'v1', true)
on conflict (consent_type, version) do nothing;
