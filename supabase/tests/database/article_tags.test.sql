begin;
create extension if not exists pgtap with schema extensions;
select plan(31);
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data,is_anonymous) values
 ('e1000000-0000-0000-0000-000000000001','{}','{}',false),
 ('e1000000-0000-0000-0000-000000000002','{}','{}',false);
create temporary table tag_test(key text primary key,value jsonb);
grant all on tag_test to authenticated,anon;

select hasnt_function('public','save_article_v1',array['uuid','uuid','bigint','text','text','jsonb'],'Tagless Article saves fail closed for stale clients');

select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
insert into tag_test values('saved',public.save_article_v1('e2000000-0000-0000-0000-000000000001',null,null,'ja','Preload','[{"kind":"paragraph","blockId":"p","text":"Frank-Starling"}]',array['前負荷','PV loop']));
select is((select value->>'version' from tag_test where key='saved'),'0','Save commits a compact receipt for the tagged revision');
select is(public.save_article_v1('e2000000-0000-0000-0000-000000000001',null,null,'ja','Preload','[{"kind":"paragraph","blockId":"p","text":"Frank-Starling"}]',array['前負荷','PV loop']),(select value from tag_test where key='saved'),'Retry returns the committed tagged receipt');
select throws_ok($$select public.save_article_v1('e2000000-0000-0000-0000-000000000001',null,null,'ja','Preload','[{"kind":"paragraph","blockId":"p","text":"Frank-Starling"}]',array['後負荷'])$$,'23505',null,'Tags participate in the operation fingerprint');
select is(public.read_article_v1(((select value->>'articleId' from tag_test where key='saved'))::uuid)->'tags','["前負荷","PV loop"]'::jsonb,'Owner reads draft tags in authored order');

select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['a','b','c','d','e','f'])$$,'22023',null,'At most five tags');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['same','same'])$$,'22023',null,'Tags are distinct');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[repeat('a',33)])$$,'22023',null,'Tags are at most 32 characters');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[''])$$,'22023',null,'Tags are nonempty');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['ＰＶ'])$$,'22023',null,'Tags are NFKC canonical');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['#preload'])$$,'22023',null,'Hash marks are presentation, not tag text');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['a,b'])$$,'22023',null,'Separators cannot be stored inside one tag');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[' lead'])$$,'22023',null,'Tags are trimmed');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array['two  spaces'])$$,'22023',null,'Inner whitespace is collapsed');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[U&'zero\200Bwidth'])$$,'22023',null,'Invisible characters are rejected');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[null::text])$$,'22023',null,'Null tags are rejected');
select throws_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',null)$$,'22023',null,'Tag list is required');
select lives_ok($$select public.save_article_v1(gen_random_uuid(),null,null,'ja','T','[]',array[repeat('😀',32),'Heart failure'])$$,'Astral characters count as code points');
reset role;
select throws_ok($$insert into studio.article_contents(owner_id,locale,title,blocks,tags) values('e1000000-0000-0000-0000-000000000001','ja','Direct','[]',array['#bad'])$$,'23514',null,'Stored revisions enforce the same tag contract');

select public.publish_article_v1(gen_random_uuid(),((select value->>'articleId' from tag_test where key='saved'))::uuid,0,'tagged-preload');
-- A later draft revision changes tags without moving the publication pointer.
select public.save_article_v1(gen_random_uuid(),((select value->>'articleId' from tag_test where key='saved'))::uuid,0,'ja','Preload','[{"kind":"paragraph","blockId":"p","text":"Frank-Starling"}]',array['SECRET draft tag']);
select is((select item->'tags' from jsonb_array_elements(public.list_my_article_summaries_v1(50,null,null)->'items') item where item->>'articleId'=(select value->>'articleId' from tag_test where key='saved')),'["SECRET draft tag"]'::jsonb,'Management lists current draft tags');

select set_config('request.jwt.claims','{}',true);
set local role anon;
select is(public.read_public_article_route_v1('tagged-preload')->'tags','["前負荷","PV loop"]'::jsonb,'Public route exposes only published tags');
select is(public.read_article_v1(((select value->>'articleId' from tag_test where key='saved'))::uuid)->'tags','["前負荷","PV loop"]'::jsonb,'Anonymous Article read resolves published tags');
select is((select item->'tags' from jsonb_array_elements(public.list_public_article_summaries_v1()->'items') item where item->>'publicSlug'='tagged-preload'),'["前負荷","PV loop"]'::jsonb,'Public summaries carry published tags');
select is(public.list_public_article_tags_v1('ja'),'[{"tag":"PV loop","articleCount":1},{"tag":"前負荷","articleCount":1}]'::jsonb,'Tag vocabulary counts only live publications');
select is(public.list_public_article_tags_v1('en'),'[]'::jsonb,'Tag vocabulary is locale scoped');
select throws_ok($$select public.list_public_article_tags_v1('fr')$$,'22023',null,'Unsupported tag locale is rejected');
reset role;

-- One Article may carry two spellings of one tag; the vocabulary counts Articles.
select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
insert into tag_test values('variants',public.save_article_v1(gen_random_uuid(),null,null,'ja','Variants','[{"kind":"paragraph","blockId":"p","text":"Loops"}]',array['pv loop','PV loop','前負荷']));
select public.publish_article_v1(gen_random_uuid(),((select value->>'articleId' from tag_test where key='variants'))::uuid,0,'tagged-variants');
select set_config('request.jwt.claims','{}',true);
set local role anon;
select is(public.list_public_article_tags_v1('ja'),'[{"tag":"PV loop","articleCount":2},{"tag":"前負荷","articleCount":2}]'::jsonb,'Vocabulary counts distinct Articles per case-insensitive tag');
reset role;
select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.unpublish_article_v1(gen_random_uuid(),((select value->>'articleId' from tag_test where key='variants'))::uuid,0);

select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.unpublish_article_v1(gen_random_uuid(),((select value->>'articleId' from tag_test where key='saved'))::uuid,1);
select set_config('request.jwt.claims','{}',true);
set local role anon;
select is(public.list_public_article_tags_v1('ja'),'[]'::jsonb,'Unpublishing removes tags from public vocabulary');
reset role;

-- Tags are persisted bytes: per-revision size and the anonymous quota count them.
select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select is(
  (select content_size_bytes from studio.article_contents c join studio.articles a on a.current_draft_content_id = c.article_content_id
    where a.article_id = ((select value->>'articleId' from tag_test where key='saved'))::uuid),
  (select octet_length(c.blocks::text) + octet_length(c.title) + octet_length(c.locale) + octet_length(to_jsonb(c.tags)::text)
    from studio.article_contents c join studio.articles a on a.current_draft_content_id = c.article_content_id
    where a.article_id = ((select value->>'articleId' from tag_test where key='saved'))::uuid)::bigint,
  'Revision size includes the encoded tags');
insert into auth.users(id,raw_app_meta_data,raw_user_meta_data,is_anonymous) values
 ('e1000000-0000-0000-0000-000000000003','{}','{}',true);
-- 32 revisions of 2,097,000 bytes leave exactly 4,864 bytes of the 64 MiB budget.
insert into studio.article_contents(owner_id,locale,title,blocks)
select 'e1000000-0000-0000-0000-000000000003','ja','F',jsonb_build_array(repeat('x',2096991)) from generate_series(1,32);
select set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":true}',true);
-- 4,855 + 4 (blocks) + 1 (title) + 2 (locale) + 2 ("[]") = 4,864: a tagless revision fits exactly.
select throws_ok($$insert into studio.article_contents(owner_id,locale,title,blocks,tags) values('e1000000-0000-0000-0000-000000000003','ja','T',jsonb_build_array(repeat('x',4855)),array['a'])$$,'54000','Anonymous storage limit reached. Sign in to keep saving.','Anonymous quota counts tag bytes');
select lives_ok($$insert into studio.article_contents(owner_id,locale,title,blocks,tags) values('e1000000-0000-0000-0000-000000000003','ja','T',jsonb_build_array(repeat('x',4855)),'{}')$$,'The same revision without tags fits the quota exactly');
select set_config('request.jwt.claims','{}',true);
select * from finish();
rollback;
