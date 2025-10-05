"use client";

import { Mutation } from "@/lib/graphql_request";
import { IncidentKind, ReportStatus } from "@/zeus";
import type { JourneyNotification } from "@/store/app-store";

type UpsertNotificationInput = {
  incidentId: string;
  title: string;
  description?: JourneyNotification["description"];
  kind?: string | null;
  status?: string | null;
  lineId?: JourneyNotification["lineId"];
  lineName?: JourneyNotification["lineName"];
  delayMinutes?: JourneyNotification["delayMinutes"];
};

type GraphQLNotification = {
  id: string;
  incidentId?: string | null;
  title: string;
  description?: string | null;
  kind?: IncidentKind | null;
  status?: ReportStatus | null;
  lineId?: string | null;
  lineName?: string | null;
  delayMinutes?: number | null;
  receivedAt: string;
};

function mapNotification(payload: GraphQLNotification): JourneyNotification {
  return {
    id: payload.id,
    incidentId: payload.incidentId ?? payload.id,
    title: payload.title,
    description: payload.description ?? null,
    kind: payload.kind ?? null,
    status: payload.status ?? undefined,
    lineId: payload.lineId ?? null,
    lineName: payload.lineName ?? null,
    delayMinutes: payload.delayMinutes ?? null,
    receivedAt: payload.receivedAt,
  };
}

const incidentKindValues = new Set<string>(Object.values(IncidentKind));
const reportStatusValues = new Set<string>(Object.values(ReportStatus));

function toIncidentKind(value?: string | null): IncidentKind | null {
  if (!value) return null;
  return incidentKindValues.has(value) ? (value as IncidentKind) : null;
}

function toReportStatus(value?: string | null): ReportStatus | null {
  if (!value) return null;
  return reportStatusValues.has(value) ? (value as ReportStatus) : null;
}

export async function upsertJourneyNotificationOnServer(
  input: UpsertNotificationInput,
): Promise<JourneyNotification> {
  const mutation = Mutation();
  const result = await mutation({
    upsertJourneyNotification: [
      {
        input: {
          incidentId: input.incidentId,
          title: input.title,
          description: input.description ?? null,
          kind: toIncidentKind(input.kind),
          status: toReportStatus(input.status),
          lineId: input.lineId ?? null,
          lineName: input.lineName ?? null,
          delayMinutes: input.delayMinutes ?? null,
        },
      },
      {
        id: true,
        incidentId: true,
        title: true,
        description: true,
        kind: true,
        status: true,
        lineId: true,
        lineName: true,
        delayMinutes: true,
        receivedAt: true,
      },
    ],
  });

  const payload = result.upsertJourneyNotification as
    | GraphQLNotification
    | null
    | undefined;

  if (!payload) {
    throw new Error("Failed to persist journey notification");
  }

  return mapNotification(payload);
}

export async function dismissJourneyNotificationOnServer(
  incidentId: string,
): Promise<boolean> {
  const mutation = Mutation();
  const result = await mutation({
    dismissJourneyNotification: [{ id: incidentId }, true],
  });

  return Boolean(result.dismissJourneyNotification);
}

export async function clearJourneyNotificationsOnServer(): Promise<boolean> {
  const mutation = Mutation();
  const result = await mutation({
    clearJourneyNotifications: true,
  });

  return Boolean(result.clearJourneyNotifications);
}
