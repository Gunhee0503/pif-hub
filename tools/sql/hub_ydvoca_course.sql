-- 영동일고 비연계어휘 로드맵(ydvoca) 코스 추가 + 종이 시험 점수 입력
-- Supabase SQL Editor에서 한 번 실행 (기존 동작은 그대로, 코스 목록에 ydvoca만 추가)
create or replace function public.vt_save_progress(p_course text, p_unit text, p_data jsonb, p_score numeric default null, p_max numeric default null, p_completed boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_sid uuid := public.my_student_id();
begin
  if v_sid is null then raise exception 'NOT_APPROVED'; end if;
  if p_course not in ('fundamental','essential','spectrum','matching','grammar','gfirst','ydvoca') then raise exception 'BAD_COURSE'; end if;
  if p_unit !~ '^[a-z0-9_-]{1,40}$' then raise exception 'BAD_UNIT'; end if;
  if octet_length(p_data::text) > 80000 then raise exception 'TOO_LARGE'; end if;
  if not exists (select 1 from public.students s join public.classes c on c.code = s.class_code
                 where s.id = v_sid and p_course = any(coalesce(s.courses, c.courses))) then raise exception 'COURSE_LOCKED'; end if;
  insert into public.vt_progress(student_id, course, unit_id, data, score, max_score, completed, updated_at)
  values (v_sid, p_course, p_unit, p_data, p_score, p_max, coalesce(p_completed,false), now())
  on conflict (student_id, course, unit_id) do update
    set data = excluded.data, score = excluded.score, max_score = excluded.max_score,
        completed = public.vt_progress.completed or excluded.completed, updated_at = now();
end $$;

-- 선생님이 종이 리뷰 테스트 점수를 넣음: 통과 판정(A>=9, B>=7)에만 쓰고 문항 분석에는 넣지 않음
create or replace function public.vt_staff_paper_score(p_student uuid, p_unit text, p_a int, p_b int, p_c int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.vt_progress; v_d jsonb; v_best jsonb; v_tot int := p_a + p_b + p_c; v_pass boolean := p_a >= 9 and p_b >= 7;
begin
  if not public.can_manage_student(p_student) then raise exception 'FORBIDDEN'; end if;
  if p_unit !~ '^f[1-4]-test$' then raise exception 'BAD_UNIT'; end if;
  if least(p_a, p_b, p_c) < 0 or greatest(p_a, p_b, p_c) > 10 then raise exception 'BAD_SCORE'; end if;
  select * into v_row from public.vt_progress where student_id = p_student and course = 'ydvoca' and unit_id = p_unit;
  v_d := coalesce(v_row.data, '{}'::jsonb);
  v_d := jsonb_set(v_d, '{paper}', coalesce(v_d->'paper', '[]'::jsonb) ||
         jsonb_build_array(jsonb_build_object('at', (extract(epoch from now()) * 1000)::bigint, 'A', p_a, 'B', p_b, 'C', p_c, 'total', v_tot, 'passed', v_pass, 'by', public.jwt_email())));
  v_best := v_d->'best';
  if v_best is null or coalesce((v_best->>'total')::int, 0) < v_tot then
    v_d := jsonb_set(v_d, '{best}', jsonb_build_object('A', p_a, 'B', p_b, 'C', p_c, 'X', coalesce(v_best->'X', 'null'::jsonb), 'total', v_tot));
  end if;
  v_d := jsonb_set(v_d, '{passed}', to_jsonb(coalesce((v_d->>'passed')::boolean, false) or v_pass));
  insert into public.vt_progress(student_id, course, unit_id, data, score, max_score, completed, updated_at)
  values (p_student, 'ydvoca', p_unit, v_d, (v_d->'best'->>'total')::numeric, 30, (v_d->>'passed')::boolean, now())
  on conflict (student_id, course, unit_id) do update
    set data = excluded.data, score = excluded.score, max_score = 30,
        completed = public.vt_progress.completed or excluded.completed, updated_at = now();
  return v_d;
end $$;
revoke all on function public.vt_staff_paper_score(uuid, text, int, int, int) from public, anon;
grant execute on function public.vt_staff_paper_score(uuid, text, int, int, int) to authenticated;
