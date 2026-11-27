CREATE TABLE "escalation_events" (
    "id" TEXT NOT NULL,
    "escalationId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "escalation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "escalation_events_escalationId_createdAt_idx" ON "escalation_events"("escalationId", "createdAt");
ALTER TABLE "escalation_events" ADD CONSTRAINT "escalation_events_escalationId_fkey"
  FOREIGN KEY ("escalationId") REFERENCES "escalations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "escalation_events" ADD CONSTRAINT "escalation_events_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
