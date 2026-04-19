-- Nerva — widget customization
-- Adds per-bot visual/behavioral overrides for the embedded widget.

alter table public.bots
  add column widget_color text not null default '#FF5A1F'
    check (widget_color ~ '^#[0-9a-fA-F]{6}$'),
  add column widget_greeting text,
  add column widget_position text not null default 'right'
    check (widget_position in ('left', 'right'));
