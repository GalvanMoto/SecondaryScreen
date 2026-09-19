import { NextRequest, NextResponse } from 'next/server';
import { executeAiCommand } from '@/lib/ai-agent';
import { getChatHistory, clearChatHistory } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;

  try {
    const history = getChatHistory(serial, 50);
    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch chat history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, serial, action } = body;

    if (action === 'clear') {
      clearChatHistory(serial);
      return NextResponse.json({ success: true, message: 'Chat history cleared' });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const targetSerial = serial || 'ZD222GMCMS';
    const result = await executeAiCommand(prompt, targetSerial);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI command failed' }, { status: 500 });
  }
}
