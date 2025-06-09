
import { NextResponse } from 'next/server';
import { firestoreAdmin } from "@/lib/firebaseAdmin";
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
        // Should not happen if docSnap.exists is true, but as a safeguard
        return NextResponse.json({ error: "User data not found" }, { status: 401 });
    }
    
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    if (userData.isRestricted) {
      return NextResponse.json({ error: "Account is restricted. Please contact support." }, { status: 403 });
    }

    // Return user data (excluding password)
    const { password: _, ...userToReturn } = userData;
    return NextResponse.json({ 
        message: "Login successful", 
        user: {
            username: userToReturn.username,
            name: userToReturn.name,
            isAdmin: !!userToReturn.isAdmin,
            isRestricted: !!userToReturn.isRestricted
        } 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error during login process:", error);
    return NextResponse.json({ error: "Login failed due to an internal server error." }, { status: 500 });
  }
}
