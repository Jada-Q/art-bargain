-- art-bargain initial schema: enums, tables, indexes, triggers, RLS policies.
-- Designed for Supabase Postgres 17. References auth.users via FK.

------------------------------------------------------------
-- 1. ENUM TYPES
------------------------------------------------------------

CREATE TYPE artwork_category AS ENUM ('poster', 'painting', 'photography');
CREATE TYPE artwork_status   AS ENUM ('draft', 'live', 'sold', 'withdrawn');
CREATE TYPE nego_mode        AS ENUM ('human_vs_agent', 'agent_vs_agent');
CREATE TYPE nego_status      AS ENUM ('active', 'accepted', 'rejected', 'stalled', 'expired');
CREATE TYPE turn_speaker     AS ENUM ('seller_agent', 'buyer_agent', 'buyer_human', 'system');
CREATE TYPE order_status     AS ENUM ('pending', 'paid', 'cancelled');

------------------------------------------------------------
-- 2. TABLES
------------------------------------------------------------

CREATE TABLE artworks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        artwork_category NOT NULL,
  price_start     numeric(12, 2) NOT NULL CHECK (price_start >= 0 AND price_start <= 1000000),
  price_floor     numeric(12, 2) NOT NULL CHECK (price_floor >= 0 AND price_floor <= 1000000),
  category_meta   jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url       text,
  thumb_url       text,
  status          artwork_status NOT NULL DEFAULT 'draft',
  seller_agent    jsonb NOT NULL DEFAULT '{"style":"friendly","urgency":3}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT price_floor_lte_start CHECK (price_floor <= price_start)
);

CREATE INDEX artworks_seller_id_idx ON artworks(seller_id);
CREATE INDEX artworks_status_idx    ON artworks(status);
CREATE INDEX artworks_category_idx  ON artworks(category);

CREATE TABLE negotiations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id    uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  buyer_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode          nego_mode NOT NULL,
  buyer_agent   jsonb,
  status        nego_status NOT NULL DEFAULT 'active',
  final_price   numeric(12, 2),
  turn_count    int NOT NULL DEFAULT 0,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz
);

CREATE INDEX negotiations_artwork_id_idx ON negotiations(artwork_id);
CREATE INDEX negotiations_buyer_id_idx   ON negotiations(buyer_id);
CREATE INDEX negotiations_status_idx     ON negotiations(status);

CREATE TABLE negotiation_turns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  uuid NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  turn_no         int NOT NULL,
  speaker         turn_speaker NOT NULL,
  message         text NOT NULL,
  offer_price     numeric(12, 2),
  reasoning       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT turns_unique_per_nego UNIQUE (negotiation_id, turn_no)
);

CREATE INDEX negotiation_turns_nego_id_idx ON negotiation_turns(negotiation_id);

CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  uuid NOT NULL REFERENCES negotiations(id) ON DELETE RESTRICT,
  artwork_id      uuid NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  buyer_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  agreed_price    numeric(12, 2) NOT NULL,
  stripe_intent   text,
  status          order_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_id_idx  ON orders(buyer_id);
CREATE INDEX orders_seller_id_idx ON orders(seller_id);

CREATE TABLE comparable_sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    artwork_category NOT NULL,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sold_price  numeric(12, 2) NOT NULL,
  sold_at     date NOT NULL,
  notes       text NOT NULL DEFAULT ''
);

CREATE INDEX comparable_sales_category_idx ON comparable_sales(category);

------------------------------------------------------------
-- 3. updated_at TRIGGERS
------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artworks_set_updated_at
  BEFORE UPDATE ON artworks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
------------------------------------------------------------

ALTER TABLE artworks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparable_sales  ENABLE ROW LEVEL SECURITY;

-- artworks: public reads only 'live'; owner sees own everything; owner writes own.
CREATE POLICY artworks_select_public_or_owner ON artworks
  FOR SELECT
  USING (status = 'live'::artwork_status OR seller_id = auth.uid());

CREATE POLICY artworks_insert_own ON artworks
  FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY artworks_update_own ON artworks
  FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY artworks_delete_own ON artworks
  FOR DELETE
  USING (seller_id = auth.uid());

-- negotiations: visible to buyer or seller of the artwork.
CREATE POLICY negotiations_select_party ON negotiations
  FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM artworks a WHERE a.id = artwork_id AND a.seller_id = auth.uid()
    )
  );

CREATE POLICY negotiations_insert_buyer ON negotiations
  FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY negotiations_update_party ON negotiations
  FOR UPDATE
  USING (
    buyer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM artworks a WHERE a.id = artwork_id AND a.seller_id = auth.uid()
    )
  );

-- negotiation_turns: visibility inherits from negotiation.
-- Inserts/updates are server-side only (service_role bypasses RLS).
CREATE POLICY negotiation_turns_select_party ON negotiation_turns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM negotiations n
        LEFT JOIN artworks a ON a.id = n.artwork_id
       WHERE n.id = negotiation_id
         AND (n.buyer_id = auth.uid() OR a.seller_id = auth.uid())
    )
  );

-- orders: visible to buyer or seller.
-- Inserts/updates are server-side only.
CREATE POLICY orders_select_party ON orders
  FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- comparable_sales: public read; no client writes.
CREATE POLICY comparable_sales_select_public ON comparable_sales
  FOR SELECT
  USING (true);
