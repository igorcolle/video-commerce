// Página vazia padrão ("Em breve") no novo design system, usada por áreas
// do menu que ainda não foram construídas (Analytics, Ajustes).
export default function PlaceholderPage({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="workbench-bg flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-surface p-lg">
      <div className="flex flex-col items-center gap-md text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary">
          <span className="material-symbols-outlined text-[32px]">{icon}</span>
        </span>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
          {title}
        </h2>
        <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
          {subtitle}
        </p>
        <span className="mt-2 rounded-full bg-surface-container-high px-3 py-1 font-label-md text-[10px] uppercase tracking-wider text-on-surface-variant">
          Em breve
        </span>
      </div>
    </section>
  );
}
