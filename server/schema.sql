CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  job_role VARCHAR(255),
  referral_source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ideas (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  initial_prompt TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'new',
  color VARCHAR(50) DEFAULT '#FFD6E0',
  tags TEXT[] DEFAULT ARRAY['Idea'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notes (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  executive_summary TEXT DEFAULT '',
  market_research TEXT DEFAULT '',
  prd TEXT DEFAULT '',
  uiux TEXT DEFAULT '',
  one_shot_prompt TEXT DEFAULT '',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  is_thinking BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL,
  prompt TEXT DEFAULT '',
  aspect_ratio VARCHAR(20) DEFAULT '1:1',
  style VARCHAR(50) DEFAULT 'artistic',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grounding_sources (
  id SERIAL PRIMARY KEY,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  source_type VARCHAR(50) DEFAULT 'web',
  uri TEXT,
  title VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id INTEGER REFERENCES ideas(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  request_id VARCHAR(100),
  model VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  image_count INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  quota_bypass BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_idea_id ON user_notes(idea_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_idea_id ON chat_messages(idea_id);
CREATE INDEX IF NOT EXISTS idx_images_idea_id ON images(idea_id);
CREATE INDEX IF NOT EXISTS idx_grounding_sources_idea_id ON grounding_sources(idea_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_id ON ai_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created_at ON ai_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_action ON ai_usage_events(action);
