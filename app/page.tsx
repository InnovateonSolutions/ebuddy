export default function RootPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_45%,_#e2e8f0_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
        <div className="mb-10 inline-flex w-fit items-center rounded-full border border-sky-200 bg-white/70 px-4 py-2 text-sm text-sky-700 shadow-sm backdrop-blur">
          Despliegue inicial activo
        </div>

        <h1 className="max-w-3xl text-5xl font-black tracking-tight text-balance sm:text-6xl">
          ebuddy ya esta en linea y listo para su siguiente etapa.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Esta primera publicacion deja visible la app en produccion mientras terminamos la
          configuracion de autenticacion e integraciones externas.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="/login"
            className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700"
          >
            Ver acceso
          </a>
          <a
            href="/api/health"
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Probar healthcheck
          </a>
        </div>
      </section>
    </main>
  )
}
