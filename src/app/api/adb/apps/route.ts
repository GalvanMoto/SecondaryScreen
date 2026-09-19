import { NextRequest, NextResponse } from 'next/server';
import { getInstalledPackages, managePackage } from '@/lib/adb';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serial = searchParams.get('serial') || undefined;
  const filter = (searchParams.get('filter') || 'user') as 'user' | 'system' | 'all';

  try {
    const packages = await getInstalledPackages(serial, filter);
    return NextResponse.json({ packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, pkg, serial } = body;

    if (!action || !pkg) {
      return NextResponse.json({ error: 'Action and pkg are required' }, { status: 400 });
    }

    const result = await managePackage(action, pkg, serial);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Package action failed' }, { status: 500 });
  }
}
