ALTER TABLE "system_settings"
  ADD COLUMN "notificationRules" JSONB NOT NULL DEFAULT '{}'::jsonb;
