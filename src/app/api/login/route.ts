
import { NextResponse } from 'next/server';
import { firestoreAdmin } from "../../../lib/firebaseAdmin"; // Changed to relative path
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (jsonError: any) {
    console.error("Error parsing JSON request body for login:", jsonError.message);
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  try {
    const { username, password } = requestBody;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const userDocRef = firestoreAdmin.collection("users").doc(username);
    const docSnap = await userDocRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const userData = docSnap.data();
    if (!userData) {
        return NextResponse.json({ error: "User data not found" }, { status: 401 });
    }
    
    // Ensure userData.password exists and is a string
    if (typeof userData.password !== 'string') {
        console.error(`User ${username} does not have a valid password hash in Firestore.`);
        return NextResponse.json({ error: "Authentication configuration error." }, { status: 500 });
    }

    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    if (userData.isRestricted) {
      return NextResponse.json({ error: "Account is restricted. Please contact support." }, { status: 403 });
    }

    // Return user data (excluding password)
    const { password: _, ...userToReturn } = userData; // Ensure 'password' is destructured out
    return NextResponse.json({ 
        message: "Login successful", 
        user: { // Ensure this structure matches what AuthContext expects
            username: userToReturn.username,
            name: userToReturn.name,
            isAdmin: !!userToReturn.isAdmin,
            isRestricted: !!userToReturn.isRestricted
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error during login process:", error);
    // Ensure a JSON response even for unexpected errors
    return NextResponse.json({ error: "Login failed due to an internal server error." }, { status: 500 });
  }
}
