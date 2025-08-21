import UserManagement from "@/components/user-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
      <UserManagement currentUser={JSON.parse(user.value)} />
    </div>
  );
};

export default Page;
