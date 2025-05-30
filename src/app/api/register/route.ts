
import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, setDoc, doc } from "firebase/firestore";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
    const { name, username, password, ipAddress, isAdmin } = body; // Added isAdmin

    // Basic validation
    if (!name || !username || !password) {
      return NextResponse.json({ error: "Name, username, and password are required" }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }


    // Check if username already exists
    const usersRef = collection(db, "users");
    // It's common to use the username (ITS ID) as the document ID for easier lookups
    const userDocRef = doc(db, "users", username);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // Add user to Firestore using username as document ID
    await setDoc(userDocRef, {
      name,
      username, // Store username field as well for querying if needed, though ID is username
      password, // Storing password in plaintext is highly insecure. This should be hashed.
      ipAddress: ipAddress || null,
      isAdmin: isAdmin || false, // Save isAdmin status, default to false
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Registration successful" }, { status: 201 });
  } catch (error: any) {
    console.error("Error registering user:", error);
    console.error("Request body:", body); // Log the body for debugging
    let errorMessage = "Registration failed";
    if (error.message) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

