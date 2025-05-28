import { NextResponse } from 'next/server';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
    const { name, username, password, ipAddress } = body;

    // Check if username already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // Add user to Firestore
    const docRef = await addDoc(collection(db, "users"), {
      name,
      username,
      password,
      ipAddress,
      isAdmin: false,
    });

    console.log("Document written with ID: ", docRef.id);
    return NextResponse.json({ message: "Registration successful" }, { status: 201 });
  } catch (error: any) {
    console.error("Error registering user:", error);
    console.error("Request body:", body);
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}
