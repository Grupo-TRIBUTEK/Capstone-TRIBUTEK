import Button from "../../ui/Button";
export default function LoginForm() {
    return (
        <form
            className="flex w-full flex-col gap-4 rounded-[2rem] border border-slate-400 bg-white px-10 py-8 text-black shadow-sm"
            method="POST"
            action="/api/auth/login"
        >
            <img
                src="/images/tras-TRIBUTEK.svg"
                alt="Logo TRIBUTEK"
                className="mx-auto h-35 w-100 object-contain"
            />
            <div className="flex flex-col items-center justify-center text-center text-[#252f46]">
                <h3 className="text-xl font-bold">BIENVENIDO/A</h3>
                <h3 className="mt-2 text-2xl font-bold">INGRESA A TU CUENTA</h3>
                <p className="mt-1 text-xs text-slate-500">
                    Accede con las credenciales asignadas por TRIBUTEK
                </p>
            </div>

            <label className="font-semibold text-[#252f46]" htmlFor="email">
                Usuario
            </label>
            <input
                className="h-14 rounded-lg border border-slate-400 px-4 outline-none placeholder:text-slate-300 focus:border-[#252f46] focus:ring-1 focus:ring-[#252f46]"
                id="email"
                name="email"
                type="email"
                placeholder="Ingrese su usuario"
                required
            />

            <label className="font-semibold text-[#252f46]" htmlFor="password">
                Contraseña
            </label>
            <input
                className="h-14 rounded-lg border border-slate-400 px-4 outline-none placeholder:text-slate-300 focus:border-[#252f46] focus:ring-1 focus:ring-[#252f46]"
                id="password"
                name="password"
                type="password"
                placeholder="Ingrese su contraseña"
                required
            />

            <a className="self-end text-sm text-[#b98b7b] underline" href="#">
                Olvidé mi contraseña
            </a>

            <Button
                className="mx-auto mt-2 w-3/4"
                type="submit"
            >
                INICIAR SESIÓN
            </Button>
        </form>
    );
}
