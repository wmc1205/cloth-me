import { z } from 'zod'

const MAX_QUERY_LENGTH = 40

// AI가 만든 검색어를 받는 모든 스키마가 같이 쓴다. 브랜드·가격까지 막지는 못하고, 링크(URL)만 거른다.
export const searchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_QUERY_LENGTH)
  .refine((query) => !/https?:|www\./i.test(query), '검색어에 링크를 넣을 수 없습니다.')

// 쇼핑 연결은 검색 페이지로 보내는 링크만 쓴다. 상품 데이터는 가져오지 않는다.
// (네이버 쇼핑 검색 API가 2026-07-31에 종료되어 상품 API 연동을 하지 않는다. docs/decisions.md)
export function shoppingSearchLinks(query: string) {
  const q = encodeURIComponent(query.trim().slice(0, MAX_QUERY_LENGTH))
  return [
    { name: '네이버쇼핑', url: `https://search.shopping.naver.com/search/all?query=${q}` },
    { name: '구글 쇼핑', url: `https://www.google.com/search?tbm=shop&q=${q}` },
  ]
}
