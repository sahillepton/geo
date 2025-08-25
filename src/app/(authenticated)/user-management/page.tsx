import { Badge } from "@/components/ui/badge";
import UserManagement from "@/components/user-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const experimental_ppr = true;

const Page = async () => {
  const user = (await cookies()).get("user");
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="px-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance text-[#262626]">
        User Management
      </h1>
      <Suspense
        fallback={
          <div className="flex flex-col justify-center items-center h-screen">
            <Badge
              variant={"secondary"}
              className="
    text-2xl 
    font-bold 
    bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 
    animate-pulse 
    border-2 border-yellow-500 
    text-yellow-800
    shadow-lg
    "
            >
              Fetching users
            </Badge>
          </div>
        }
      >
        <UserManagement currentUser={JSON.parse(user.value)} />
      </Suspense>
    </div>
  );
};

export default Page;
