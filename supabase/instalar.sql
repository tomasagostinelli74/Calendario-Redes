-- =====================================================================
-- Calendario de contenidos: instalación en Supabase
-- Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Se puede ejecutar más de una vez sin romper nada (no duplica datos).
-- =====================================================================

-- 1) Tabla principal ---------------------------------------------------
create table if not exists public.contenidos (
  id            uuid primary key default gen_random_uuid(),
  fecha         date,                         -- fecha de publicación (vacía = sin fecha)
  titulo        text not null default '',
  estado        text not null default 'Idea',
  formato       text not null default '',
  red           text not null default '',
  link          text not null default '',
  notas         text not null default '',
  inicio        date,                         -- inicio de producción (barra del Gantt)
  responsable   text not null default '',
  por           text not null default '',     -- quién hizo el último cambio
  version       integer not null default 1,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now(),
  eliminado_at  timestamptz,                  -- "papelera": si tiene fecha, no se muestra
  eliminado_por text
);
create index if not exists contenidos_fecha_idx on public.contenidos (fecha) where eliminado_at is null;

-- versión y fecha de modificación automáticas en cada cambio
create or replace function public.contenidos_touch() returns trigger
language plpgsql as $$
begin
  new.version     := coalesce(old.version, 0) + 1;
  new.actualizado := now();
  new.id          := old.id;
  new.creado      := old.creado;
  return new;
end $$;
drop trigger if exists contenidos_touch on public.contenidos;
create trigger contenidos_touch before update on public.contenidos
  for each row execute function public.contenidos_touch();

-- 2) Opciones de los desplegables (estados con color, formatos, redes) ---
create table if not exists public.opciones (
  id     bigint generated always as identity primary key,
  tipo   text not null check (tipo in ('estado', 'formato', 'red')),
  nombre text not null,
  color  text,
  orden  integer not null default 0,
  unique (tipo, nombre)
);
insert into public.opciones (tipo, nombre, color, orden) values
  ('estado', 'Idea', '#94A3B8', 1),
  ('estado', 'En curso', '#3B82F6', 2),
  ('estado', 'Faltan tomas', '#F97316', 3),
  ('estado', 'En proceso de revisión', '#A855F7', 4),
  ('estado', 'Aceptada', '#14B8A6', 5),
  ('estado', 'Para publicar', '#EAB308', 6),
  ('estado', 'Programado', '#6366F1', 7),
  ('estado', 'Publicado', '#22C55E', 8),
  ('estado', 'no se publica', '#78716C', 9),
  ('estado', 'ELIMINADO', '#EF4444', 10),
  ('formato', 'Reel', null, 1),
  ('formato', 'Post', null, 2),
  ('formato', 'Carrusel', null, 3),
  ('formato', 'Historia', null, 4),
  ('formato', 'Video', null, 5),
  ('formato', 'Otro', null, 6),
  ('red', 'Instagram', null, 1),
  ('red', 'TikTok', null, 2),
  ('red', 'LinkedIn', null, 3),
  ('red', 'Facebook', null, 4),
  ('red', 'YouTube', null, 5),
  ('red', 'X', null, 6)
on conflict (tipo, nombre) do nothing;

-- 3) Permisos (RLS) ----------------------------------------------------
-- La app usa la clave pública: puede leer, crear y editar.
-- NO puede borrar definitivamente: "Eliminar" solo completa eliminado_at.
alter table public.contenidos enable row level security;
alter table public.opciones   enable row level security;

drop policy if exists "contenidos_leer"   on public.contenidos;
drop policy if exists "contenidos_crear"  on public.contenidos;
drop policy if exists "contenidos_editar" on public.contenidos;
drop policy if exists "opciones_leer"     on public.opciones;
create policy "contenidos_leer"   on public.contenidos for select to anon, authenticated using (true);
create policy "contenidos_crear"  on public.contenidos for insert to anon, authenticated with check (true);
create policy "contenidos_editar" on public.contenidos for update to anon, authenticated using (true) with check (true);
create policy "opciones_leer"     on public.opciones   for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.contenidos to anon, authenticated;
grant select on public.opciones to anon, authenticated;

-- 4) Tiempo real: los cambios de un compañero aparecen al instante -------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contenidos') then
    alter publication supabase_realtime add table public.contenidos;
  end if;
end $$;

-- 5) Datos: los 38 contenidos que había en la Google Sheet ---------
-- Solo se cargan si la tabla está vacía (así no se duplican).
insert into public.contenidos (fecha, titulo, estado, formato, red, link, notas, inicio, responsable, por)
select fecha::date, titulo, estado, formato, red, link, notas, inicio::date, responsable, por from (values
  ('2026-09-25', 'Institucional Colagreco 1', 'Publicado', 'Post', 'Instagram', 'https://www.instagram.com/p/DdtwDvZB3rN/', '', null, '', 'migrado desde Sheets'),
  ('2026-09-26', 'Converti Bienal', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-09-28', 'Mejores TIFs', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-09-29', '3 Razones AE Meme Funes', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-09-30', 'UADE Online', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-01', 'TEDx Spotorno', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-02', 'Salud Digital', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-03', 'Huerta', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-04', 'Campanella', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-05', 'Sabado', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-06', 'Campanella', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-07', 'Recoleta Reel', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-08', 'Receta Hongos', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-09', 'Ciencias del Comportamiento', 'Publicado', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-10', 'MAFALDA 1', 'Para publicar', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-11', 'Resiudos Converti', 'Para publicar', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-12', 'FAIN', 'En curso', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-13', 'Por qué UADE', 'Para publicar', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-14', 'Campanella BS AS', 'En proceso de revisión', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-15', 'Colagreco 2', 'Para publicar', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-16', 'Razones Psico', 'En curso', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-17', 'FEDEX COMEX', 'En curso', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-19', 'Cancer de Mama', 'Para publicar', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-20', 'Campanella Charla', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-21', 'Colagreco Visita clase', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-22', 'Receta 3 Costa', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-27', 'Negocios Digitales 3 razones', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-28', 'Campanella Realización', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-29', 'Juanjo Taiwan', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-10-30', 'CEMIC', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-02', 'UADE CAN', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-03', 'Semana de la Gastronomía', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-04', 'Reacciones alumnos', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-05', 'Receta 4 Costa', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-06', 'GSS', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-11', 'Labs FAEN', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-18', 'Infaltables de Campanella', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets'),
  ('2026-11-25', 'Reedición entrevista Campanella', 'Idea', '', 'Instagram', '', '', null, '', 'migrado desde Sheets')
) as v(fecha, titulo, estado, formato, red, link, notas, inicio, responsable, por)
where not exists (select 1 from public.contenidos);

-- Listo. Verificación rápida:
select count(*) as contenidos_cargados from public.contenidos where eliminado_at is null;
