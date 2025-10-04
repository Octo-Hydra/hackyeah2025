import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

export type RegisterData = z.infer<typeof registerSchema>;

/**
 * Register a new user with credentials
 */
export async function registerUser(data: RegisterData) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(data);

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Get database
    const client = await clientPromise;
    const db = client.db();

    // Check if user already exists
    const existingUser = await db
      .collection("users")
      .findOne({ email: validatedData.email });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Create user with email already verified (MVP mode)
    const result = await db.collection("users").insertOne({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      emailVerified: new Date(), // Auto-verify for MVP
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      success: true,
      userId: result.insertedId.toString(),
    };
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      throw new Error("Invalid input data");
    }
    throw error;
  }
}
