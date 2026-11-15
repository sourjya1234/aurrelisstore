-- Applied to the aurrelis-ops project (eqixqpcxlfedijqghggo) on 2026-11-15.

alter table public.io_orders
  add column if not exists shipping_line2 text,
  add column if not exists shipping_state text;

-- Marks a pending order paid (by Razorpay order id in payment_ref) and deducts
-- stock for its items in the same transaction. Idempotent: a second call finds
-- no pending order and returns null without touching stock.
create or replace function public.io_mark_order_paid(p_payment_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text;
begin
  update io_orders
     set status = 'paid'
   where payment_ref = p_payment_ref
     and status = 'pending'
  returning id, order_number into v_id, v_number;

  if v_id is null then
    return null;
  end if;

  update io_product_variants v
     set stock = greatest(v.stock - i.qty, 0)
    from (
      select variant_id, sum(quantity)::int as qty
        from io_order_items
       where order_id = v_id and variant_id is not null
       group by variant_id
    ) i
   where v.id = i.variant_id;

  return v_number;
end;
$$;

revoke all on function public.io_mark_order_paid(text) from public, anon, authenticated;
grant execute on function public.io_mark_order_paid(text) to service_role;
