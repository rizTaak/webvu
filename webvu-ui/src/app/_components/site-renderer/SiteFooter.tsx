import type { Footer } from '@webvu/shared';

/** Only platforms with a URL entered are rendered. SPEC.md § Footer config. */
const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

export function SiteFooter({
  footer,
  businessName,
}: {
  footer: Footer;
  businessName: string;
}) {
  return (
    <footer
      className="w-full border-t"
      style={{
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        borderColor: 'hsl(var(--border))',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:px-8">
        <p style={{ opacity: 0.7 }}>
          © {new Date().getFullYear()} {businessName}
        </p>

        {footer.socialLinks.length > 0 && (
          <ul className="flex flex-wrap items-center gap-4">
            {footer.socialLinks.map((link) => (
              <li key={link.platform}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="transition-opacity hover:opacity-70"
                  style={{ opacity: 0.75 }}
                >
                  {PLATFORM_LABELS[link.platform] ?? link.platform}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
