-- Article tags are authored discovery metadata. They belong to the immutable
-- Article content revision, so a draft tag edit follows exactly the same
-- save/publish boundary as the title and blocks: the public projection only
-- ever exposes the tags of the content its publication pointer references.
--
-- Clients normalize while typing; the database remains the authority for the
-- canonical form (NFKC, single inner spaces, no separators or invisible
-- characters, 1-32 code points, at most five distinct tags).

create function studio.valid_article_tags_v1(p_tags text[]) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_tags is not null
    and coalesce(pg_catalog.array_ndims(p_tags), 1) = 1
    and pg_catalog.cardinality(p_tags) <= 5
    and not exists (
      select 1
      from pg_catalog.unnest(p_tags) as tag(value)
      where tag.value is null
        or pg_catalog.char_length(tag.value) not between 1 and 32
        or tag.value is not nfkc normalized
        or tag.value <> pg_catalog.btrim(tag.value)
        or pg_catalog.strpos(tag.value, '  ') > 0
        or tag.value ~ '[#,\u3001\u0001-\u001f\u007f-\u009f\u1680\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]'
    )
    and (
      select pg_catalog.count(*) = pg_catalog.count(distinct tag.value)
      from pg_catalog.unnest(p_tags) as tag(value)
    );
$$;

revoke all on function studio.valid_article_tags_v1(text[]) from public;

alter table studio.article_contents
  add column tags text[] not null default '{}'::text[]
  constraint article_contents_tags check (studio.valid_article_tags_v1(tags));

comment on column studio.article_contents.tags is
  'Authored discovery tags of this immutable revision. Public surfaces read them only through the publication pointer.';

drop function public.save_article_v1(uuid, uuid, bigint, text, text, jsonb);

create function public.save_article_v1(
  p_operation_id uuid,
  p_article_id uuid,
  p_expected_version bigint,
  p_locale text,
  p_title text,
  p_blocks jsonb,
  p_tags text[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  request_body jsonb;
  replayed jsonb;
  target_article_id uuid;
  target_version bigint;
  content_id uuid;
  current_row studio.articles%rowtype;
  result_body jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  request_body := jsonb_build_object(
    'articleId', p_article_id,
    'expectedVersion', p_expected_version,
    'locale', p_locale,
    'title', p_title,
    'blocks', p_blocks,
    'tags', to_jsonb(p_tags)
  );
  replayed := studio.begin_operation_v1(actor, p_operation_id, 'save-article-v1', request_body);
  if replayed is not null then return replayed; end if;

  if not studio.valid_article_tags_v1(p_tags) then
    raise exception 'Article tags must be at most five distinct canonical tags of 1-32 characters'
      using errcode = '22023';
  end if;

  insert into studio.article_contents (owner_id, locale, title, blocks, tags)
  values (actor, p_locale, p_title, p_blocks, p_tags)
  returning article_content_id into content_id;
  perform studio.project_article_snapshot_refs_v1(content_id, actor, p_blocks);

  if p_article_id is null then
    if p_expected_version is not null then
      raise exception 'new Article must omit expectedVersion' using errcode = '22023';
    end if;
    target_article_id := gen_random_uuid();
    target_version := 0;
    insert into studio.articles (
      article_id, owner_id, version, current_draft_content_id
    ) values (
      target_article_id, actor, target_version, content_id
    );
  else
    select * into current_row from studio.articles
    where article_id = p_article_id for update;
    if not found or current_row.owner_id <> actor or current_row.deleted_at is not null then
      raise exception 'Article not found' using errcode = 'P0002';
    end if;
    if p_expected_version is null or current_row.version <> p_expected_version then
      raise exception 'Article version conflict' using errcode = '40001';
    end if;
    target_article_id := current_row.article_id;
    target_version := current_row.version + 1;
    update studio.articles
    set version = target_version,
        current_draft_content_id = content_id,
        updated_at = now()
    where article_id = target_article_id;
  end if;

  result_body := jsonb_build_object(
    'articleId', target_article_id,
    'version', target_version,
    'locale', p_locale,
    'title', p_title,
    'blocks', p_blocks,
    'tags', to_jsonb(p_tags)
  );
  return studio.finish_operation_v1(actor, p_operation_id, result_body);
end;
$$;

alter function public.save_article_v1(uuid, uuid, bigint, text, text, jsonb, text[]) owner to postgres;
revoke all on function public.save_article_v1(uuid, uuid, bigint, text, text, jsonb, text[]) from public, anon;
grant execute on function public.save_article_v1(uuid, uuid, bigint, text, text, jsonb, text[]) to authenticated;

create or replace function public.read_article_v1(p_article_id uuid) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with resolved as (
    select
      a.article_id,
      case
        when a.owner_id = auth.uid() then a.current_draft_content_id
        else p.current_content_id
      end as content_id,
      case
        when a.owner_id = auth.uid() then a.version
        else 0
      end as version,
      p.article_id is not null as published
    from studio.articles a
    left join studio.article_publications p on p.article_id = a.article_id
    where a.article_id = p_article_id
      and a.deleted_at is null
      and (a.owner_id = auth.uid() or p.article_id is not null)
  )
  select jsonb_build_object(
    'schemaId', 'circleheart-studio-article-draft-v2',
    'articleId', r.article_id,
    'draftVersion', r.version,
    'visibility', case when r.published then 'public' else 'draft' end,
    'locale', c.locale,
    'title', c.title,
    'tags', to_jsonb(c.tags),
    'blocks', c.blocks
  )
  from resolved r
  join studio.article_contents c on c.article_content_id = r.content_id;
$$;

create or replace function public.list_my_article_summaries_v1(
  p_limit integer default 50,
  p_before_updated_at timestamp with time zone default null,
  p_before_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  result_body jsonb;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'List page limit must be within [1, 100]' using errcode = '22023';
  end if;
  if (p_before_updated_at is null) <> (p_before_id is null) then
    raise exception 'List cursor timestamp and ID must be supplied together' using errcode = '22023';
  end if;

  with page as materialized (
    select
      a.article_id,
      a.version,
      c.locale,
      c.title,
      c.tags,
      a.created_at,
      a.updated_at,
      case when p.article_id is null then 'draft' else 'public' end as visibility,
      p.public_slug
    from studio.articles a
    join studio.article_contents c on c.article_content_id = a.current_draft_content_id
    left join studio.article_publications p on p.article_id = a.article_id
    where a.owner_id = actor
      and a.deleted_at is null
      and (
        p_before_updated_at is null
        or (a.updated_at, a.article_id) < (p_before_updated_at, p_before_id)
      )
    order by a.updated_at desc, a.article_id desc
    limit p_limit
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'articleId', article_id,
      'version', version,
      'visibility', visibility,
      'locale', locale,
      'title', title,
      'tags', to_jsonb(tags),
      'createdAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt', to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'publicSlug', public_slug
    ) order by updated_at desc, article_id desc), '[]'::jsonb),
    'nextCursor', case when count(*) = p_limit then (
      select jsonb_build_object(
        'timestamp', to_char(last_page.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'id', last_page.article_id
      )
      from page last_page
      order by last_page.updated_at asc, last_page.article_id asc
      limit 1
    ) else null end
  ) into result_body
  from page;
  return result_body;
end;
$$;

create or replace function public.list_public_article_summaries_v1(
  p_limit integer default 50,
  p_before_published_at timestamp with time zone default null,
  p_before_id uuid default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result_body jsonb;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'List page limit must be within [1, 100]' using errcode = '22023';
  end if;
  if (p_before_published_at is null) <> (p_before_id is null) then
    raise exception 'List cursor timestamp and ID must be supplied together' using errcode = '22023';
  end if;

  with page as materialized (
    select
      p.article_id,
      a.owner_id,
      c.locale,
      c.title,
      c.tags,
      p.public_slug,
      p.updated_at as published_at,
      excerpt.value as excerpt
    from studio.article_publications p
    join studio.articles a on a.article_id = p.article_id
    join studio.article_contents c on c.article_content_id = p.current_content_id
    left join lateral (
      select left(block.value ->> 'text', 240) as value
      from jsonb_array_elements(c.blocks) with ordinality block(value, position)
      where block.value ->> 'kind' in ('heading', 'paragraph')
        and length(btrim(coalesce(block.value ->> 'text', ''))) > 0
      order by block.position
      limit 1
    ) excerpt on true
    where a.deleted_at is null
      and (
        p_before_published_at is null
        or (p.updated_at, p.article_id) < (p_before_published_at, p_before_id)
      )
    order by p.updated_at desc, p.article_id desc
    limit p_limit
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'articleId', article_id,
      'author', studio.public_author_v1(owner_id),
      'locale', locale,
      'title', title,
      'tags', to_jsonb(tags),
      'excerpt', excerpt,
      'publicSlug', public_slug,
      'publishedAt', to_char(published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) order by published_at desc, article_id desc), '[]'::jsonb),
    'nextCursor', case when count(*) = p_limit then (
      select jsonb_build_object(
        'timestamp', to_char(last_page.published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'id', last_page.article_id
      )
      from page last_page
      order by last_page.published_at asc, last_page.article_id asc
      limit 1
    ) else null end
  ) into result_body
  from page;
  return result_body;
end;
$$;

create or replace function public.read_public_article_route_v1(
  p_article_route_key text
) returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  result_body jsonb;
begin
  if p_article_route_key is null
    or p_article_route_key <> btrim(p_article_route_key)
    or char_length(p_article_route_key) < 3
    or char_length(p_article_route_key) > 96
    or p_article_route_key !~ '^[a-z0-9-]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'Public Article route key is invalid';
  end if;

  select jsonb_build_object(
    'schemaId', 'circleheart-studio-published-article-v1',
    'articleId', publication.article_id,
    'articleContentId', publication.current_content_id,
    'publicSlug', publication.public_slug,
    'locale', content.locale,
    'title', content.title,
    'tags', to_jsonb(content.tags),
    'blocks', content.blocks,
    'publishedAt', to_char(
      publication.published_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'updatedAt', to_char(
      publication.updated_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    )
  ) into result_body
  from studio.article_publications as publication
  join studio.articles as article
    on article.article_id = publication.article_id
  join studio.article_contents as content
    on content.article_content_id = publication.current_content_id
  where article.deleted_at is null
    and (
      publication.public_slug = p_article_route_key
      or (
        p_article_route_key ~
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and publication.article_id::text = p_article_route_key
      )
    )
  order by (publication.public_slug = p_article_route_key) desc
  limit 1;

  return result_body;
end;
$$;

-- Shared vocabulary for authors choosing tags. It counts only live
-- publications, so a draft tag never becomes discoverable through it.
create function public.list_public_article_tags_v1(
  p_locale text,
  p_limit integer default 100
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result_body jsonb;
begin
  if p_locale is null or p_locale not in ('ja', 'en') then
    raise exception 'Tag locale must be ja or en' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Tag list limit must be within [1, 200]' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'tag', ranked.tag,
    'articleCount', ranked.article_count
  ) order by ranked.article_count desc, ranked.tag), '[]'::jsonb)
  into result_body
  from (
    select tag.value as tag, count(*) as article_count
    from studio.article_publications p
    join studio.articles a on a.article_id = p.article_id
    join studio.article_contents c on c.article_content_id = p.current_content_id
    cross join lateral unnest(c.tags) as tag(value)
    where a.deleted_at is null
      and c.locale = p_locale
    group by tag.value
    order by count(*) desc, tag.value
    limit p_limit
  ) ranked;
  return result_body;
end;
$$;

revoke all on function public.list_public_article_tags_v1(text, integer) from public;
grant execute on function public.list_public_article_tags_v1(text, integer) to anon, authenticated;
