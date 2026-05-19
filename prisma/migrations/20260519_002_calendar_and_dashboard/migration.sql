CREATE TABLE "calendar_events" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "creatorId"      UUID NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "startAt"        TIMESTAMPTZ NOT NULL,
    "endAt"          TIMESTAMPTZ,
    "allDay"         BOOLEAN NOT NULL DEFAULT false,
    "location"       TEXT,
    "color"          TEXT,
    "shareWithAll"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL,
    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_event_attendees" (
    "id"      UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "userId"  UUID NOT NULL,
    "status"  TEXT NOT NULL DEFAULT 'invited',
    CONSTRAINT "calendar_event_attendees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_dashboard_preferences" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId"         UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "hiddenWidgets"  TEXT[] NOT NULL DEFAULT '{}',
    "updatedAt"      TIMESTAMPTZ NOT NULL,
    CONSTRAINT "user_dashboard_preferences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "calendar_events_organizationId_startAt_idx" ON "calendar_events"("organizationId", "startAt");
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "calendar_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "calendar_event_attendees" ADD CONSTRAINT "calendar_event_attendees_eventId_userId_key" UNIQUE ("eventId", "userId");
ALTER TABLE "user_dashboard_preferences" ADD CONSTRAINT "user_dashboard_preferences_userId_organizationId_key" UNIQUE ("userId", "organizationId");
