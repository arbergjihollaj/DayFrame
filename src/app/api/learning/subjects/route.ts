import { NextResponse } from "next/server";
import { createSubject, deleteSubject, getSubjects } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ subjects: getSubjects() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.deleteId) deleteSubject(Number(body.deleteId));
  if (body.name) createSubject(String(body.name));
  return NextResponse.json({ subjects: getSubjects() });
}
