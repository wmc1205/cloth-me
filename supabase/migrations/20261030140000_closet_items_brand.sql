-- 사진에서 로고/라벨 글자가 읽힐 때만 채우는 브랜드. 추측해서 채우지 않으므로 대부분 비어 있다.
alter table public.closet_items add column brand text;
