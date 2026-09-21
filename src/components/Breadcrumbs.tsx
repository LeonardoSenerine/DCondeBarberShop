import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  to?: string;
}

/** Trail ending in the current page (no `to`), e.g. Início › Termos de uso. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Você está em" className="mb-8">
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-muted">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-faint">
                ›
              </span>
            )}
            {item.to ? (
              <Link to={item.to} className="text-muted transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
