import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} Webvu. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-text">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-text">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
