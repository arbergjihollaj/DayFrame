import { NextResponse } from "next/server";
import { createTopic, deleteTopic, getTopics, updateTopic, updateTopicConfidence } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ topics: getTopics() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (body.deleteId) deleteTopic(Number(body.deleteId));
  if (body.confidenceId) updateTopicConfidence(Number(body.confidenceId), Number(body.confidence));
  if (body.topicId) updateTopic(Number(body.topicId), body.topic);
  if (body.topic && !body.topicId) createTopic(body.topic);
  return NextResponse.json({ topics: getTopics() });
}
