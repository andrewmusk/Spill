'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignOutButton, UserButton, useUser } from '@clerk/nextjs';

export function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <nav className="nav">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/" style={{ marginRight: '20px', fontWeight: 'bold' }}>
            Spill Admin
          </Link>
          {isSignedIn && (
            <>
              <Link href="/users" style={{ marginRight: '20px' }}>
                Users
              </Link>
              <Link href="/polls" style={{ marginRight: '20px' }}>
                Polls
              </Link>
              <Link href="/responses" style={{ marginRight: '20px' }}>
                Responses
              </Link>
              <Link href="/simulator" style={{ marginRight: '20px' }}>
                Simulator
              </Link>
            </>
          )}
        </div>
        <div>
          {isSignedIn ? (
            <>
              <UserButton />
              <SignOutButton>
                <button className="btn" style={{ marginLeft: '10px' }}>
                  Sign Out
                </button>
              </SignOutButton>
            </>
          ) : (
            <SignInButton>
              <button className="btn">Sign In</button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
}
