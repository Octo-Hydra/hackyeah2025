import { ObjectId } from "mongodb";
import type {
  GraphQLContext,
  IncidentModel,
  IncidentKind,
  IncidentClass,
  ReportStatus,
} from "../db/collections";

interface CreateReportInput {
  title: string;
  description?: string;
  kind: IncidentKind;
  status?: ReportStatus;
  vehicleIds?: Array<string | null>;
}

interface UpdateReportInput {
  title?: string;
  description?: string;
  kind?: IncidentKind;
  incidentClass?: IncidentClass;
  status?: ReportStatus;
  vehicleIds?: Array<string | null>;
}

function kindToClass(kind: string): IncidentClass {
  if (
    kind === "VEHICLE_FAILURE" ||
    kind === "NETWORK_FAILURE" ||
    kind === "PEDESTRIAN_ACCIDENT"
  ) {
    return "CLASS_1";
  }
  return "CLASS_2";
}

function mapStoredDoc(doc: IncidentModel, id: ObjectId | string) {
  const idStr = typeof id === "string" ? id : id.toString();
  return {
    id: idStr,
    title: doc.title,
    description: doc.description ?? null,
    kind: doc.kind,
    incidentClass: doc.incidentClass,
    status: doc.status,
    vehicleIds: Array.isArray(doc.vehicleIds)
      ? doc.vehicleIds.map((x: ObjectId | string | null) => {
          if (!x) return null;
          return typeof x === "string" ? x : x.toString();
        })
      : null,
    createdBy: doc.createdBy ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const carrierMutation = {
  async createReport(
    _: unknown,
    { input }: { input: CreateReportInput },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const incidentClass = kindToClass(input.kind);
    const doc: IncidentModel = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      incidentClass,
      status: (input.status || "PUBLISHED") as ReportStatus,
      vehicleIds: Array.isArray(input.vehicleIds)
        ? input.vehicleIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    return mapStoredDoc(doc, res.insertedId);
  },

  async saveDraft(
    _: unknown,
    { input }: { input: CreateReportInput },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const incidentClass = kindToClass(input.kind);
    const doc: IncidentModel = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      incidentClass,
      status: "DRAFT",
      vehicleIds: Array.isArray(input.vehicleIds)
        ? input.vehicleIds.map((id) => (id ? new ObjectId(id) : null))
        : null,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection<IncidentModel>("Incidents").insertOne(doc);
    return mapStoredDoc(doc, res.insertedId);
  },

  async updateReport(
    _: unknown,
    { id, input }: { id: string; input: UpdateReportInput },
    ctx: GraphQLContext
  ) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const update: Partial<IncidentModel> = { updatedAt: now };
    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description;
    if (input.kind !== undefined) {
      update.kind = input.kind;
      update.incidentClass = kindToClass(input.kind);
    }
    if (input.incidentClass !== undefined)
      update.incidentClass = input.incidentClass;
    if (input.status !== undefined) update.status = input.status;
    if (input.vehicleIds !== undefined)
      update.vehicleIds = Array.isArray(input.vehicleIds)
        ? input.vehicleIds.map((id) => (id ? new ObjectId(id) : null))
        : null;

    const res = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: "after" }
      );
    if (!res) throw new Error("Report not found");
    return mapStoredDoc(res, res._id!);
  },

  async deleteReport(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
    const db = ctx.db;
    const res = await db
      .collection<IncidentModel>("Incidents")
      .deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount && res.deletedCount > 0) {
      return { success: true, message: "Deleted" };
    }
    return { success: false, message: "Not found" };
  },

  async publishReport(_: unknown, { id }: { id: string }, ctx: GraphQLContext) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const res = await db
      .collection<IncidentModel>("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status: "PUBLISHED", updatedAt: now } },
        { returnDocument: "after" }
      );
    if (!res) throw new Error("Report not found");
    return mapStoredDoc(res, res._id!);
  },
};

export default carrierMutation;
