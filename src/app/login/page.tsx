import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { cookies } from "next/headers";

const Page = async () => {
  const user = (await cookies()).get("user");

  if (user) {
    redirect("/geotaggedvideos");
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
};

export default Page;
