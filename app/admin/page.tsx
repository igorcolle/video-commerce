import { redirect } from "next/navigation";

// A raiz do admin sempre leva à lista de jornadas.
export default function AdminHome() {
  redirect("/admin/jornadas");
}
