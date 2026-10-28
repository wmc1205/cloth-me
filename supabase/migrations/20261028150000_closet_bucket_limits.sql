-- 서버 검사를 우회해 supabase-js로 직접 올려도 형식·크기가 제한되도록 버킷에서도 한 번 더 건다.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'closet';
