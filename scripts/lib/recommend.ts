// 추천 5곳을 고르는 규칙.
//
// 풀은 진료 검색 상위 15곳이다. 병원명·진료과·전문의 정보에 진료명이 있으면 앞으로 둔다.
// 같은 지역 다른 진료 글의 상위 3곳에 이미 있는 병원은, 이번 풀에 다른 병원이 있을 때만 뒤로 민다.
// 1순위 고정은 이 함수 밖에서 마지막에 다시 맨 앞으로 올린다.

export interface RankableHospital {
  id: string;
  name: string;
  category?: string;
  specialistsInfo?: string;
}

export function pickRecommended<T extends RankableHospital>(
  pool: T[],
  specialty: string,
  siblingTopIds: Set<string>,
  limit = 5,
): T[] {
  const token = specialty && specialty !== '일반' ? specialty : '';
  const hasAlternative = pool.some(h => !siblingTopIds.has(h.id));
  return pool
    .map((h, index) => {
      const text = `${h.name} ${h.category || ''} ${h.specialistsInfo || ''}`;
      return {
        h,
        index,
        pushed: hasAlternative && siblingTopIds.has(h.id) ? 1 : 0,
        specialtyMatch: token && text.includes(token) ? 0 : 1,
      };
    })
    .sort((a, b) => a.pushed - b.pushed || a.specialtyMatch - b.specialtyMatch || a.index - b.index)
    .slice(0, limit)
    .map(row => row.h);
}
