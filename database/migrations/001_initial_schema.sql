-- ============================================================
-- BizScout AI — Complete Database Schema & RLS Policies
-- File: database/migrations/001_initial_schema.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  business_name TEXT,
  role TEXT,
  services TEXT[] DEFAULT '{}',
  target_industries TEXT[] DEFAULT '{}',
  default_country TEXT DEFAULT 'India',
  default_state TEXT,
  default_city TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- ============================================================
-- 2. LEADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  source TEXT NOT NULL DEFAULT 'overpass',
  name TEXT NOT NULL,
  normalized_name TEXT,
  category TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  latitude FLOAT,
  longitude FLOAT,
  phone TEXT,
  email TEXT,
  website TEXT,
  whatsapp_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  linkedin_url TEXT,
  youtube_url TEXT,
  rating FLOAT,
  review_count INTEGER DEFAULT 0,
  lead_score INTEGER NOT NULL DEFAULT 0,
  score_breakdown JSONB,
  opportunity_summary TEXT,
  score_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'saved', 'contacted', 'follow_up', 'replied',
    'qualified', 'won', 'lost', 'do_not_contact'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);
CREATE INDEX IF NOT EXISTS leads_city_idx ON leads(city);
CREATE INDEX IF NOT EXISTS leads_category_idx ON leads(category);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
CREATE INDEX IF NOT EXISTS leads_lead_score_idx ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_external_id_idx ON leads(user_id, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS leads_user_external_id_uidx ON leads(user_id, external_id) WHERE external_id IS NOT NULL;

-- ============================================================
-- 3. LEAD SOURCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source_external_id TEXT,
  field_name TEXT NOT NULL,
  source_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'overpass',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_sources_unique_field UNIQUE (lead_id, field_name, source_type)
);

CREATE INDEX IF NOT EXISTS lead_sources_lead_id_idx ON lead_sources(lead_id);

-- ============================================================
-- 4. SEARCH JOBS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS search_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  service_type TEXT DEFAULT 'social_media_design',
  requested_count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'searching', 'enriching', 'analyzing', 'saving', 'completed', 'failed'
  )),
  progress_stage TEXT DEFAULT 'queued',
  results_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS search_jobs_user_id_idx ON search_jobs(user_id);
CREATE INDEX IF NOT EXISTS search_jobs_status_idx ON search_jobs(status);
CREATE INDEX IF NOT EXISTS search_jobs_created_at_idx ON search_jobs(created_at DESC);

-- ============================================================
-- 5. CAMPAIGNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'social_media_design',
  target_category TEXT,
  target_location TEXT,
  offer_name TEXT,
  offer_price NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at DESC);

-- ============================================================
-- 6. CAMPAIGN LEADS (JUNCTION)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_leads (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, lead_id)
);

CREATE INDEX IF NOT EXISTS campaign_leads_campaign_id_idx ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_leads_lead_id_idx ON campaign_leads(lead_id);

-- ============================================================
-- 7. OUTREACH MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram_dm', 'email', 'call_script')),
  tone TEXT DEFAULT 'friendly',
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_messages_user_id_idx ON outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS outreach_messages_lead_id_idx ON outreach_messages(lead_id);
CREATE INDEX IF NOT EXISTS outreach_messages_created_at_idx ON outreach_messages(created_at DESC);

-- ============================================================
-- 8. LEAD ACTIVITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_activities_user_id_idx ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS lead_activities_lead_id_idx ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS lead_activities_created_at_idx ON lead_activities(created_at DESC);

-- ============================================================
-- 9. API USAGE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_user_id_idx ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON api_usage(created_at DESC);

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on every table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: own profile only
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Leads: own leads only
DROP POLICY IF EXISTS "leads_select_own" ON leads;
DROP POLICY IF EXISTS "leads_insert_own" ON leads;
DROP POLICY IF EXISTS "leads_update_own" ON leads;
DROP POLICY IF EXISTS "leads_delete_own" ON leads;
CREATE POLICY "leads_select_own" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "leads_insert_own" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leads_update_own" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "leads_delete_own" ON leads FOR DELETE USING (auth.uid() = user_id);

-- 3. Lead Sources: related lead belongs to auth.uid()
DROP POLICY IF EXISTS "lead_sources_select_own" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_insert_own" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_update_own" ON lead_sources;
DROP POLICY IF EXISTS "lead_sources_delete_own" ON lead_sources;
CREATE POLICY "lead_sources_select_own" ON lead_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sources.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "lead_sources_insert_own" ON lead_sources FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sources.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "lead_sources_update_own" ON lead_sources FOR UPDATE
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sources.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "lead_sources_delete_own" ON lead_sources FOR DELETE
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_sources.lead_id AND leads.user_id = auth.uid()));

-- 4. Search Jobs: own jobs only
DROP POLICY IF EXISTS "search_jobs_select_own" ON search_jobs;
DROP POLICY IF EXISTS "search_jobs_insert_own" ON search_jobs;
DROP POLICY IF EXISTS "search_jobs_update_own" ON search_jobs;
CREATE POLICY "search_jobs_select_own" ON search_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "search_jobs_insert_own" ON search_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "search_jobs_update_own" ON search_jobs FOR UPDATE USING (auth.uid() = user_id);

-- 5. Campaigns: own campaigns only
DROP POLICY IF EXISTS "campaigns_select_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_insert_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON campaigns;
DROP POLICY IF EXISTS "campaigns_delete_own" ON campaigns;
CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- 6. Campaign Leads: BOTH campaign AND lead belong to auth.uid()
DROP POLICY IF EXISTS "campaign_leads_select_own" ON campaign_leads;
DROP POLICY IF EXISTS "campaign_leads_insert_own" ON campaign_leads;
DROP POLICY IF EXISTS "campaign_leads_update_own" ON campaign_leads;
DROP POLICY IF EXISTS "campaign_leads_delete_own" ON campaign_leads;
CREATE POLICY "campaign_leads_select_own" ON campaign_leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_leads.campaign_id AND campaigns.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = campaign_leads.lead_id AND leads.user_id = auth.uid())
  );
CREATE POLICY "campaign_leads_insert_own" ON campaign_leads FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_leads.campaign_id AND campaigns.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = campaign_leads.lead_id AND leads.user_id = auth.uid())
  );
CREATE POLICY "campaign_leads_update_own" ON campaign_leads FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_leads.campaign_id AND campaigns.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = campaign_leads.lead_id AND leads.user_id = auth.uid())
  );
CREATE POLICY "campaign_leads_delete_own" ON campaign_leads FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_leads.campaign_id AND campaigns.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM leads WHERE leads.id = campaign_leads.lead_id AND leads.user_id = auth.uid())
  );

-- 7. Outreach Messages: own messages only
DROP POLICY IF EXISTS "outreach_messages_select_own" ON outreach_messages;
DROP POLICY IF EXISTS "outreach_messages_insert_own" ON outreach_messages;
DROP POLICY IF EXISTS "outreach_messages_update_own" ON outreach_messages;
DROP POLICY IF EXISTS "outreach_messages_delete_own" ON outreach_messages;
CREATE POLICY "outreach_messages_select_own" ON outreach_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outreach_messages_insert_own" ON outreach_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outreach_messages_update_own" ON outreach_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outreach_messages_delete_own" ON outreach_messages FOR DELETE USING (auth.uid() = user_id);

-- 8. Lead Activities: own activities only
DROP POLICY IF EXISTS "lead_activities_select_own" ON lead_activities;
DROP POLICY IF EXISTS "lead_activities_insert_own" ON lead_activities;
CREATE POLICY "lead_activities_select_own" ON lead_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lead_activities_insert_own" ON lead_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. API Usage: own usage only
DROP POLICY IF EXISTS "api_usage_select_own" ON api_usage;
DROP POLICY IF EXISTS "api_usage_insert_own" ON api_usage;
CREATE POLICY "api_usage_select_own" ON api_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_usage_insert_own" ON api_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 12. UPDATED_AT TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_outreach_updated_at ON outreach_messages;
CREATE TRIGGER update_outreach_updated_at BEFORE UPDATE ON outreach_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 13. RELOAD SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
