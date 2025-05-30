
import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore"; // Removed unused collection, query, where, getDocs

export async function POST(request: Request) {
  let requestBody;
  try {
    // Attempt to parse the request body as JSON
    requestBody = await request.json();
  } catch (jsonError: any) {
    // If JSON parsing fails, log the error and return a 400 response
    console.error("Error parsing JSON request body:", jsonError.message);
    return NextResponse.json({ error: "Invalid request format. Expected JSON.", detail: jsonError.message }, { status: 400 });
  }

  try {
    // Destructure data from the parsed request body
    const { name, username, password, ipAddress, isAdmin } = requestBody;

    // Basic server-side validation
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
    // Catch any other errors during the registration process
    console.error("Error during user registration process:", error);
    // It's crucial to log the full error object to understand the cause.
    // If error.stack is available, it provides more context.
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    console.error("Request body that led to error:", requestBody);

    // Return a generic 500 error message to the client
    // Avoid exposing raw internal error messages to the client in production
    return NextResponse.json({ error: "Registration failed due to an internal server error." }, { status: 500 });
  }
}
