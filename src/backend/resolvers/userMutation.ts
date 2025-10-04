import { ObjectId } from "mongodb";
import type {
  GraphQLContext,
  IncidentModel,
  IncidentKind,
  ReportStatus,
} from "../db/collections";

interface CreateReportInput {
  title: string;
  description?: string;
  kind: IncidentKind;
  status?: ReportStatus;
  lineIds?: Array<string | null>;
}

export const userMutation = {
  async createReport(
    _: unknown,
    { input }: { input: CreateReportInput },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
    const now = new Date().toISOString();

    // Determine incidentClass based on kind
    const incidentClass =
      input.kind === "VEHICLE_FAILURE" ||
      input.kind === "NETWORK_FAILURE" ||
      input.kind === "PEDESTRIAN_ACCIDENT"
        ? "CLASS_1"
        : "CLASS_2";

    const doc: IncidentModel = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      incidentClass,
      status: (input.status || "PUBLISHED") as ReportStatus,
      lineIds: Array.isArray(input.lineIds)
        ? input.lineIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    return {
      id: res.insertedId.toString(),
      ...doc,
      lineIds:
        doc.lineIds?.map((id) =>
          id ? (typeof id === "string" ? id : id.toString()) : null
        ) ?? null,
    };
  },
};

export default userMutation;
