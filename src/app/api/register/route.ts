
import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    console.error("Error parsing JSON request body:", jsonError.message);
    return NextResponse.json({ error: "Invalid request format. Expected JSON.", detail: jsonError.message }, { status: 400 });
  }

  try {
    const { name, username, password, ipAddress } = requestBody; // Removed isAdmin

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

    const userDocRef = doc(db, "users", username);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    await setDoc(userDocRef, {
      name,
      username,
      password, // Storing password in plaintext is highly insecure. This should be hashed.
      ipAddress: ipAddress || null,
      isAdmin: false, // Default new users to not be admin
      isRestricted: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Registration successful" }, { status: 201 });

  } catch (error: any) {
    console.error("Error during user registration process:", error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("Request body that led to error:", requestBody);
    return NextResponse.json({ error: "Registration failed due to an internal server error." }, { status: 500 });
  }
}
