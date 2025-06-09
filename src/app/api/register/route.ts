
import { NextResponse } from 'next/server';
import { firestoreAdmin } from "@/lib/firebaseAdmin"; // Use Admin SDK
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin'; // Import admin for Timestamp

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    console.error("Error parsing JSON request body:", jsonError.message);
    return NextResponse.json({ error: "Invalid request format. Expected JSON.", detail: jsonError.message }, { status: 400 });
  }

  try {
    const { name, username, password, ipAddress } = requestBody;

    if (!name || !username || !password) {
      return NextResponse.json({ error: "Name, username, and password are required" }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters and numbers" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const userDocRef = firestoreAdmin.collection("users").doc(username);
    const docSnap = await userDocRef.get();

    if (docSnap.exists) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await userDocRef.set({
      name,
      username,
      password: hashedPassword,
      ipAddress: ipAddress || null,
      isAdmin: false,
      isRestricted: false,
      createdAt: admin.firestore.Timestamp.now(), // Use Firestore Timestamp
    });

    return NextResponse.json({ message: "Registration successful" }, { status: 201 });

  } catch (error: any) {
    console.error("Error during user registration process:", error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    // Avoid logging potentially sensitive requestBody directly in production if it contains password
    // console.error("Request body that led to error:", requestBody); 
    return NextResponse.json({ error: "Registration failed due to an internal server error." }, { status: 500 });
  }
}
