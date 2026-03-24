import { NextRequest, NextResponse } from 'next/server';

/* ──────────────────────────────────────
   POST /api/login
   Production: connect to your database
   ────────────────────────────────────── */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: true, message: 'Gebruikersnaam en wachtwoord zijn verplicht.' },
        { status: 400 }
      );
    }

    // TODO: Replace with real database authentication
    // Example: const user = await db.users.findOne({ username });
    // if (!user || !await bcrypt.compare(password, user.passwordHash)) { ... }

    return NextResponse.json(
      { error: true, message: 'Onjuiste inloggegevens.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: true, message: 'Er is een serverfout opgetreden.' },
      { status: 500 }
    );
  }
}
