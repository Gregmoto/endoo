import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <p className="text-8xl font-black text-gray-100 select-none leading-none">404</p>

        {/* Icon */}
        <div className="mt-2 mb-6 flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold leading-none">E</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900">Sidan hittades inte</h1>
        <p className="mt-2 text-sm text-gray-500">
          Den här sidan existerar inte eller har flyttats.
        </p>

        <div className="mt-8 flex flex-col gap-3 items-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Gå till startsidan
          </Link>
          <Link
            href="javascript:history.back()"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Gå tillbaka
          </Link>
        </div>
      </div>
    </div>
  )
}
