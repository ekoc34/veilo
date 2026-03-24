import { NextRequest, NextResponse } from 'next/server';

/* ──────────────────────────────────────
   POST /api/register
   Production: connect to your database
   ────────────────────────────────────── */

// Dutch error messages
const ERRORS = {
  MISSING_FIELDS: 'Alle velden zijn verplicht.',
  USERNAME_TAKEN: 'Deze gebruikersnaam is al in gebruik.',
  EMAIL_TAKEN: 'Dit e-mailadres is al geregistreerd.',
  USERNAME_INVALID: 'Gebruikersnaam mag alleen letters, cijfers, - en _ bevatten.',
  USERNAME_TOO_SHORT: 'Gebruikersnaam moet minimaal 3 tekens lang zijn.',
  USERNAME_TOO_LONG: 'Gebruikersnaam mag maximaal 20 tekens lang zijn.',
  PASSWORD_TOO_SHORT: 'Wachtwoord moet minimaal 6 tekens lang zijn.',
  EMAIL_INVALID: 'Voer een geldig e-mailadres in.',
  SERVER_ERROR: 'Er is een serverfout opgetreden.',
};

function validateUsername(username: string): string | null {
  if (username.length < 3) return ERRORS.USERNAME_TOO_SHORT;
  if (username.length > 20) return ERRORS.USERNAME_TOO_LONG;
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return ERRORS.USERNAME_INVALID;
  return null;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, email, password } = body;

    // Validate required fields
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { ok: false, message: ERRORS.MISSING_FIELDS },
        { status: 400 }
      );
    }

    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json(
        { ok: false, message: usernameError },
        { status: 400 }
      );
    }

    // Validate email
    if (!validateEmail(email)) {
      return NextResponse.json(
        { ok: false, message: ERRORS.EMAIL_INVALID },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, message: ERRORS.PASSWORD_TOO_SHORT },
        { status: 400 }
      );
    }

    // TODO: Replace with real database registration
    // Example:
    // const existingUser = await db.users.findOne({ username });
    // if (existingUser) return ... USERNAME_TAKEN
    // const existingEmail = await db.users.findOne({ email });
    // if (existingEmail) return ... EMAIL_TAKEN
    // const hashedPassword = await bcrypt.hash(password, 12);
    // await db.users.create({ name, username, email, passwordHash: hashedPassword });

    return NextResponse.json(
      { ok: false, message: 'Registratie is momenteel niet beschikbaar. Database-configuratie vereist.' },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: ERRORS.SERVER_ERROR },
      { status: 500 }
    );
  }
}
