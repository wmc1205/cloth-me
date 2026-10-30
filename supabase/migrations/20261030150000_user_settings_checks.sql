-- 서버 Zod 검증에만 기대지 않도록, 앱 등 다른 클라이언트가 직접 써도 잘못된 값이 들어가지 않게 DB에서도 막는다.
-- 개발용 프로젝트에 먼저 적용해 확인한 뒤 운영에 반영한다.

alter table public.user_settings
  add constraint user_settings_recommend_days_valid check (
    cardinality(recommend_days) between 1 and 7
    and recommend_days <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  -- 시간대 이름의 실제 존재 여부는 DB check로 알 수 없어 형식과 길이만 제한한다. 존재 여부는 서버 Zod(Intl)가 검사한다.
  -- recommend_time은 time 타입이라 형식이 이미 보장된다.
  add constraint user_settings_timezone_valid check (
    length(timezone) between 1 and 64 and timezone ~ '^[A-Za-z0-9_+/-]+$'
  );
