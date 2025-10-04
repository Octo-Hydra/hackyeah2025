import { ObjectId } from "mongodb";

function kindToClass(kind: string) {
  if (
    kind === "VEHICLE_FAILURE" ||
    kind === "NETWORK_FAILURE" ||
    kind === "PEDESTRIAN_ACCIDENT"
  ) {
    return "CLASS_1";
  }
  return "CLASS_2";
}

function mapStoredDoc(doc: any, id: any) {
  return {
    id: id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    kind: doc.kind,
    incidentClass: doc.incidentClass,
    status: doc.status,
    vehicleIds: Array.isArray(doc.vehicleIds)
      ? doc.vehicleIds.map((x: any) => (x ? x.toString() : null))
      : null,
    createdBy: doc.createdBy ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const carrierMutation = {
  async createReport(_: any, { input }: any, ctx: any) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const incidentClass = kindToClass(input.kind);
    const doc = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      incidentClass,
      status: input.status || "PUBLISHED",
      vehicleIds: Array.isArray(input.vehicleIds)
        ? input.vehicleIds.map((id: any) => (id ? new ObjectId(id) : null))
        : null,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection("Incidents").insertOne(doc);
    return mapStoredDoc(doc, res.insertedId);
  },

  async saveDraft(_: any, { input }: any, ctx: any) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const incidentClass = kindToClass(input.kind);
    const doc = {
      title: input.title,
      description: input.description || null,
      kind: input.kind,
      incidentClass,
      status: "DRAFT",
      vehicleIds: Array.isArray(input.vehicleIds)
        ? input.vehicleIds.map((id: any) => (id ? new ObjectId(id) : null))
        : null,
      createdBy: ctx.session?.user?.email || null,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection("Incidents").insertOne(doc);
    return mapStoredDoc(doc, res.insertedId);
  },

  async updateReport(_: any, { id, input }: any, ctx: any) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const update: any = { updatedAt: now };
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
        ? input.vehicleIds.map((id: any) => (id ? new ObjectId(id) : null))
        : null;

    const res = await db
      .collection("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: "after" as any },
      );
    if (!res.value) throw new Error("Report not found");
    return mapStoredDoc(res.value, res.value._id);
  },

  async deleteReport(_: any, { id }: any, ctx: any) {
    const db = ctx.db;
    const res = await db
      .collection("Incidents")
      .deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount && res.deletedCount > 0) {
      return { success: true, message: "Deleted" };
    }
    return { success: false, message: "Not found" };
  },

  async publishReport(_: any, { id }: any, ctx: any) {
    const db = ctx.db;
    const now = new Date().toISOString();
    const res = await db
      .collection("Incidents")
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { status: "PUBLISHED", updatedAt: now } },
        { returnDocument: "after" as any },
      );
    if (!res.value) throw new Error("Report not found");
    return mapStoredDoc(res.value, res.value._id);
  },
};

export default carrierMutation;
